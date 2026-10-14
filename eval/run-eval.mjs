// Mini eval: caught / missed / false alarm per document against hand-labelled gold.
//
//   node eval/run-eval.mjs                 rule baseline (no key needed)
//   node eval/run-eval.mjs --mode=llm      real API (ANTHROPIC_API_KEY), records raw responses
//   node eval/run-eval.mjs --mode=replay   re-score recorded LLM responses offline
//
// Matching: a prediction counts for a gold clause when its category is the clause's
// category (or an allowed alternative) AND its validated quote sits in a segment that
// contains the clause's anchor or one of its alt_anchors.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { CATEGORIES } from '../src/core/categories.js';
import { canon } from '../src/core/normalize.js';
import { analyze } from '../src/core/pipeline.js';
import { plainSegments, segmentDocument } from '../src/core/segment.js';
import { anthropicProvider } from '../src/llm/anthropic.js';
import { recordingProvider, replayProvider } from '../src/llm/replay.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const mode = args.mode || 'rules';
const model = args.model || 'claude-opus-5-5';
const only = args.doc ? new Set(args.doc.split(',')) : null;

const corpus = JSON.parse(readFileSync('eval/corpus.json', 'utf8'));
const gold = JSON.parse(readFileSync('eval/gold/gold.json', 'utf8'));
mkdirSync('eval/results/raw', { recursive: true });

const perDoc = [];
for (const doc of corpus.documents) {
  if (only && !only.has(doc.id)) continue;
  const path = `eval/cache/${doc.id}.html`;
  if (!existsSync(path)) { console.error(`eksik: ${path} — önce: node eval/fetch.mjs`); process.exit(1); }
  const dom = new JSDOM(readFileSync(path, 'utf8'));
  const { segments } = segmentDocument(dom.window.document);
  const segs = plainSegments(segments);

  const report = await analyze({ segments: segs, hidden: [], meta: { url: doc.url, title: doc.name } }, providerFor(doc), { now: () => 'eval' });
  if (mode === 'llm') writeFileSync(`eval/results/raw/${doc.id}.${model}.json`, JSON.stringify({ origin: 'recorded', model, recorded_at: new Date().toISOString(), responses: recorded }, null, 1));
  perDoc.push(score(doc, segs, gold.documents[doc.id], report));
  console.log(`${doc.id.padEnd(12)} recall ${pct(perDoc.at(-1).recall)}  precision ${pct(perDoc.at(-1).precision)}  (${perDoc.at(-1).tp}/${perDoc.at(-1).gold} yakalandı, ${perDoc.at(-1).fp.length} gold dışı)`);
}

var recorded = [];
function providerFor(doc) {
  if (mode === 'rules') return null;
  if (mode === 'replay') {
    const f = `eval/results/raw/${doc.id}.${model}.json`;
    if (!existsSync(f)) { console.error(`kayıt yok: ${f} — önce --mode=llm`); process.exit(1); }
    return replayProvider(JSON.parse(readFileSync(f, 'utf8')));
  }
  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY tanımlı değil'); process.exit(1); }
  recorded = [];
  return recordingProvider(anthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY, model, effort: args.effort || 'medium' }), recorded);
}

function score(doc, segs, clauses, report) {
  const canonSegs = segs.map((s) => ({ id: s.id, c: canon(s.text) }));
  const locate = (anchor) => canonSegs.filter((s) => s.c.includes(canon(anchor))).map((s) => s.id);
  const goldRows = clauses.map((g) => {
    const segIds = new Set([g.anchor, ...(g.alt_anchors || [])].flatMap(locate));
    return { ...g, segIds, cats: new Set([g.category, ...(g.alt_categories || [])]), hits: [] };
  });
  const unlocated = goldRows.filter((g) => !g.segIds.size).map((g) => g.id);
  if (unlocated.length) console.warn(`  ! ${doc.id}: çapası metinde bulunamayan gold maddeler: ${unlocated.join(', ')}`);

  const preds = report.findings;
  const fp = [];
  const confusions = [];
  for (const p of preds) {
    const matches = goldRows.filter((g) => g.cats.has(p.category) && g.segIds.has(p.segment_id));
    if (matches.length) matches.forEach((g) => g.hits.push(p));
    else {
      const sameSpot = goldRows.find((g) => g.segIds.has(p.segment_id));
      (sameSpot ? confusions : fp).push({ category: p.category, severity: p.severity, segment_id: p.segment_id, quote: short(p.quote), ...(sameSpot ? { gold: `${sameSpot.id}:${sameSpot.category}` } : {}) });
    }
  }
  const tp = goldRows.filter((g) => g.hits.length).length;
  const matchedPreds = preds.length - fp.length - confusions.length;
  return {
    doc: doc.id,
    held_out: Boolean(doc.held_out),
    gold: goldRows.length,
    tp,
    recall: tp / goldRows.length,
    preds: preds.length,
    precision: preds.length ? matchedPreds / preds.length : 0,
    missed: goldRows.filter((g) => !g.hits.length).map((g) => ({ id: g.id, category: g.category, anchor: g.anchor })),
    fp,
    confusions,
    rejected: report.rejected.map((r) => ({ category: r.category, code: r.reject_code, quote: short(r.quote) })),
    possible_misses: report.possible_misses.length,
    status: report.status,
    score: report.score?.value ?? null,
    llm_errors: report.llm_errors,
    perCategory: Object.fromEntries(Object.keys(CATEGORIES).map((c) => {
      const rows = goldRows.filter((g) => g.category === c);
      return [c, { gold: rows.length, tp: rows.filter((g) => g.hits.length).length }];
    })),
  };
}

// ---- summary ---------------------------------------------------------------
const sum = (k, rows = perDoc) => rows.reduce((n, d) => n + (typeof d[k] === 'number' ? d[k] : d[k].length), 0);
const agg = (rows) => ({
  gold: sum('gold', rows), tp: sum('tp', rows), preds: sum('preds', rows),
  fp: sum('fp', rows), confusions: sum('confusions', rows), rejected: sum('rejected', rows),
  recall: sum('tp', rows) / sum('gold', rows),
  precision: sum('preds', rows) ? (sum('preds', rows) - sum('fp', rows) - sum('confusions', rows)) / sum('preds', rows) : 0,
});
const all = agg(perDoc);
const dev = agg(perDoc.filter((d) => !d.held_out));
const held = agg(perDoc.filter((d) => d.held_out));
const label = mode === 'rules' ? 'rules' : `${mode}.${model}`;
writeFileSync(`eval/results/${label}.json`, JSON.stringify({ mode, model: mode === 'rules' ? null : model, all, dev, held_out: held, perDoc }, null, 1));
writeFileSync(`eval/results/${label}.md`, markdown(label, all, dev, held));
console.log(`\nTOPLAM recall ${pct(all.recall)} precision ${pct(all.precision)} | geliştirme ${pct(dev.recall)}/${pct(dev.precision)} | ayrılmış ${pct(held.recall)}/${pct(held.precision)}`);
console.log(`→ eval/results/${label}.md`);

function markdown(label, all, dev, held) {
  const lines = [`# Eval sonucu: \`${label}\``, '', `Kesin eşleşme: kategori + gold çapasını içeren segment. "Gold dışı" tahminler otomatik olarak yanlış alarm sayılır; bir kısmı gold'da olmayan gerçek riskler olabilir (aşağıda listelenir, elle gözden geçirin).`, '',
    '| Küme | Gold madde | Yakalanan | Kaçırılan | Tahmin | Gold dışı (yanlış alarm) | Kategori karışıklığı | Recall | Precision |', '|---|---|---|---|---|---|---|---|---|'];
  for (const [n, a] of [['Geliştirme (6 belge)', dev], ['Ayrılmış: zoom', held], ['Toplam', all]]) {
    lines.push(`| ${n} | ${a.gold} | ${a.tp} | ${a.gold - a.tp} | ${a.preds} | ${a.fp} | ${a.confusions} | ${pct(a.recall)} | ${pct(a.precision)} |`);
  }
  if (mode !== 'rules') lines.push('', `Doğrulayıcının reddettiği model iddiası: **${all.rejected}** (skor ve rapora girmedi).`);
  lines.push('', '## Kategori bazında recall', '', '| Kategori | Gold | Yakalanan |', '|---|---|---|');
  for (const c of Object.keys(CATEGORIES)) {
    const g = perDoc.reduce((n, d) => n + d.perCategory[c].gold, 0);
    const t = perDoc.reduce((n, d) => n + d.perCategory[c].tp, 0);
    if (g) lines.push(`| ${CATEGORIES[c].label} | ${g} | ${t} |`);
  }
  for (const d of perDoc) {
    lines.push('', `## ${d.doc}${d.held_out ? ' (ayrılmış)' : ''} — recall ${pct(d.recall)}, precision ${pct(d.precision)}, durum: ${d.status}, skor: ${d.score ?? '—'}`);
    lines.push('', '**Kaçırılan:**', ...(d.missed.length ? d.missed.map((m) => `- ${m.id} \`${m.category}\` — "${m.anchor}"`) : ['- yok']));
    lines.push('', '**Yanlış alarm (gold dışı):**', ...(d.fp.length ? d.fp.map((f) => `- \`${f.category}\` ${f.segment_id}: "${f.quote}"`) : ['- yok']));
    if (d.confusions.length) lines.push('', '**Doğru yer, farklı kategori:**', ...d.confusions.map((f) => `- \`${f.category}\` (gold: ${f.gold}) ${f.segment_id}`));
    if (d.rejected.length) lines.push('', '**Reddedilen model iddiaları:**', ...d.rejected.map((r) => `- \`${r.category}\` ${r.code}: "${r.quote}"`));
    if (d.llm_errors.length) lines.push('', `**LLM hataları:** ${JSON.stringify(d.llm_errors)}`);
  }
  return lines.join('\n') + '\n';
}

function pct(x) { return `${Math.round(x * 100)}%`; }
function short(s) { const t = String(s ?? '').replace(/\s+/g, ' '); return t.length > 110 ? `${t.slice(0, 107)}…` : t; }
