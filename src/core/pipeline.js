// Orchestration: segments -> (injection scan, rule scan) -> LLM per chunk -> deterministic
// validation -> score + uncertainty. Pure apart from provider.complete(); runs unchanged
// in the extension service worker, in the Cypress harness page, and in the Node eval.

import { CATEGORIES, GENERIC_EXPLANATION } from './categories.js';
import { assessInjection } from './injection.js';
import { buildUserMessage, SYSTEM_PROMPT } from './prompt.js';
import { ruleFindings } from './rules.js';
import { toApiSchema } from './schema.js';
import { computeScore } from './score.js';
import { validateLlmOutput } from './validate.js';

export const DISCLAIMER_TR = 'Bu araç hukuki tavsiye vermez. Sonuçlar otomatik üretilir ve hatalı ya da eksik olabilir; her maddeyi orijinal metinden kendiniz okuyun.';
export const REPORT_VERSION = 1;

const CHUNK_CHARS = 120_000;
const MAX_CHUNKS = 4;
const MIN_LEGAL_CHARS = 1500;
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

/**
 * @param {{segments: Seg[], hidden?: Seg[], meta?: {url?: string, title?: string}}} input
 * @param {{name: string, model?: string, complete: Function} | null} provider  null => rules-only mode
 * @param {{now?: () => string, onProgress?: (msg: string) => void}} [opts]
 */
export async function analyze(input, provider, opts = {}) {
  const { segments, hidden = [], meta = {} } = input;
  const progress = opts.onProgress || (() => {});
  const injection = assessInjection(segments, hidden);
  const rules = ruleFindings(segments.filter((s) => !injection.suspectIds.has(s.id)));
  const charsTotal = segments.reduce((n, s) => n + s.text.length, 0);

  const base = {
    version: REPORT_VERSION,
    analyzed_at: (opts.now || (() => new Date().toISOString()))(),
    url: meta.url || null,
    title: meta.title || null,
    provider: provider ? { name: provider.name, model: provider.model || null } : { name: 'rules-only', model: null },
    disclaimer: DISCLAIMER_TR,
    injection: summarizeInjection(injection),
  };

  if (charsTotal < MIN_LEGAL_CHARS) {
    return finalize({ ...base, mode: provider ? 'llm' : 'rules', findings: [], rejected: [], possible_misses: [], not_assessable: [],
      coverage: coverage(segments, segments, charsTotal), llm_errors: [], document_type: 'unknown' },
    [{ code: 'short_text', message_tr: `Sayfada analiz edilecek yeterli metin yok (${charsTotal} karakter). Metin bir sekmenin/akordeonun içinde gizli olabilir.` }]);
  }

  if (!provider) {
    const findings = rules.map((r) => ({ ...r, explanation_tr: GENERIC_EXPLANATION[r.category], confidence: 'low', flags: ['rule_only'] }));
    return finalize({ ...base, mode: 'rules', findings, rejected: [], possible_misses: [], not_assessable: [],
      coverage: coverage(segments, segments, charsTotal), llm_errors: [], document_type: 'unknown' },
    [{ code: 'rules_only', message_tr: 'LLM anahtarı tanımlı değil; yalnızca anahtar kelime kuralları çalıştı. Açıklamalar genel nitelikte, maddeye özgü değil.' }]);
  }

  // ---- LLM path -------------------------------------------------------------
  const chunks = chunkSegments(segments, CHUNK_CHARS);
  const usedChunks = chunks.slice(0, MAX_CHUNKS);
  const accepted = [];
  const rejected = [];
  const notAssessable = [];
  const llmErrors = [];
  let documentType = null;
  let modelReportedInstructions = false;
  const sentSegments = [];

  for (let i = 0; i < usedChunks.length; i++) {
    progress(`LLM analizi: bölüm ${i + 1}/${usedChunks.length}`);
    const chunk = usedChunks[i];
    const user = buildUserMessage(chunk, { ...meta, part: i + 1, parts: usedChunks.length });
    const result = await callWithOneRetry(provider, user, chunk, injection.suspectIds);
    if (!result.ok) { llmErrors.push({ part: i + 1, errors: result.errors }); continue; }
    sentSegments.push(...chunk);
    documentType ||= result.document_type;
    modelReportedInstructions ||= result.page_instructions_observed;
    notAssessable.push(...result.not_assessable);
    for (const f of result.accepted) {
      if (!accepted.some((a) => a.category === f.category && a.segment_id === f.segment_id)) accepted.push(f);
    }
    rejected.push(...result.rejected);
  }

  const llmCategories = new Set(accepted.map((f) => f.category));
  const possibleMisses = rules
    .filter((r) => !llmCategories.has(r.category))
    .filter((r, idx, arr) => arr.findIndex((x) => x.category === r.category) === idx) // one example per category
    .map((r) => ({ ...r, explanation_tr: GENERIC_EXPLANATION[r.category] }));

  const report = {
    ...base,
    mode: 'llm',
    document_type: documentType || 'unknown',
    findings: accepted,
    rejected,
    possible_misses: possibleMisses,
    not_assessable: [...new Set(notAssessable)],
    coverage: coverage(segments, sentSegments, charsTotal),
    llm_errors: llmErrors,
  };
  report.injection.model_reported = modelReportedInstructions;
  if (report.injection.detected || modelReportedInstructions) applySeverityFloor(report.findings);
  return finalize(report, uncertaintyReasons(report, chunks.length > MAX_CHUNKS));
}

async function callWithOneRetry(provider, user, chunk, suspectIds) {
  let lastErrors = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    let parsed;
    try {
      const res = await provider.complete({ system: SYSTEM_PROMPT, user, schema: toApiSchema() });
      parsed = JSON.parse(res.text);
    } catch (e) {
      lastErrors = [e.code ? `${e.code}: ${e.message}` : String(e.message || e)];
      if (e.retryable === false) break;
      continue;
    }
    const v = validateLlmOutput(parsed, chunk, { suspectIds });
    if (v.ok) return v;
    lastErrors = v.errors;
  }
  return { ok: false, errors: lastErrors };
}

/**
 * Under suspected injection, the model may have been talked into downplaying clauses.
 * Severity can then only go *up* to the category default, never stay below it.
 */
function applySeverityFloor(findings) {
  for (const f of findings) {
    const floor = CATEGORIES[f.category].defaultSeverity;
    if (SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[floor]) {
      f.severity_from_model = f.severity;
      f.severity = floor;
      f.flags.push('severity_raised');
    }
  }
}

function uncertaintyReasons(r, truncated) {
  const reasons = [];
  if (r.llm_errors.length) reasons.push({ code: 'llm_error', message_tr: `${r.llm_errors.length} bölüm analiz edilemedi: ${r.llm_errors.map((e) => e.errors[0]).join(' | ')}` });
  if (truncated || r.coverage.ratio < 0.999) reasons.push({ code: 'partial_coverage', message_tr: `Metnin yalnızca %${Math.round(r.coverage.ratio * 100)}'i analiz edildi.` });
  if (r.document_type === 'not_legal') reasons.push({ code: 'not_legal', message_tr: 'Model bu sayfanın bir sözleşme/politika metni olmadığını düşünüyor.' });
  if (r.injection.detected || r.injection.model_reported) reasons.push({ code: 'injection', message_tr: 'Sayfada analiz aracını yönlendirmeye çalışan metin var. Sonuçlar bu nedenle güvenilmez olabilir.' });
  const hiddenClean = r.injection.hidden_chars;
  if (hiddenClean > 0.2 * r.coverage.chars_total && !r.injection.hidden_hits.length) reasons.push({ code: 'hidden_content', message_tr: `Sayfada ${hiddenClean} karakterlik görünmeyen (kapalı/gizli) metin var ve güvenlik gereği analiz edilmedi. Kapalı bölümleri açıp yeniden analiz edin.` });
  const ungrounded = r.rejected.filter((x) => x.reject_code === 'UNGROUNDED_QUOTE' || x.reject_code === 'QUOTE_FROM_SUSPECT_SEGMENT');
  if (ungrounded.length) reasons.push({ code: 'rejected_claims', message_tr: `Modelin ${ungrounded.length} iddiası metinde doğrulanamadığı için atıldı.` });
  const seriousMisses = r.possible_misses.filter((m) => CATEGORIES[m.category].defaultSeverity !== 'low');
  if (seriousMisses.length >= 2) reasons.push({ code: 'possible_misses', message_tr: `Anahtar kelime kontrolü, modelin raporlamadığı ${seriousMisses.length} risk türüne işaret ediyor (aşağıda, doğrulanmamış).` });
  const weak = r.findings.filter((f) => f.flags.includes('weak_support') || f.flags.includes('low_confidence'));
  if (weak.length) reasons.push({ code: 'weak_findings', message_tr: `${weak.length} bulgu düşük güvenle işaretlendi.`, minor: true });
  if (r.not_assessable.length) reasons.push({ code: 'not_assessable', message_tr: `Model ${r.not_assessable.length} konuyu değerlendiremedi.`, minor: true });
  return reasons;
}

function finalize(report, reasons) {
  report.findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  report.uncertainty = reasons;
  const blocking = reasons.filter((x) => !x.minor).map((x) => x.code);
  if (blocking.some((c) => c === 'short_text' || c === 'not_legal') || (report.mode === 'llm' && report.coverage.ratio === 0)) {
    report.status = 'insufficient';
    report.score = null;
  } else {
    report.status = blocking.length ? 'uncertain' : 'confident';
    report.score = computeScore(report.findings);
  }
  return report;
}

function chunkSegments(segments, maxChars) {
  const chunks = [];
  let cur = [];
  let size = 0;
  for (const s of segments) {
    if (size + s.text.length > maxChars && cur.length) { chunks.push(cur); cur = []; size = 0; }
    cur.push(s);
    size += s.text.length + 8;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

function coverage(all, sent, charsTotal) {
  const charsSent = sent.reduce((n, s) => n + s.text.length, 0);
  return { segments_total: all.length, segments_sent: sent.length, chars_total: charsTotal, chars_sent: charsSent, ratio: charsTotal ? charsSent / charsTotal : 0 };
}

function summarizeInjection(inj) {
  return {
    detected: inj.detected,
    hidden_segment_count: inj.hiddenSegmentCount,
    hidden_chars: inj.hiddenChars,
    visible_hits: inj.visibleHits,
    hidden_hits: inj.hiddenHits,
    model_reported: false,
  };
}

/** @typedef {{id: string, text: string, kind: string}} Seg */
