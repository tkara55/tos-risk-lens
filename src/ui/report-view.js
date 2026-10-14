// Renders a report object into a container. Shared by the side panel and the demo
// harness. All model-derived strings go through textContent — never innerHTML — so a
// page or model cannot inject markup into the extension UI.

import { CATEGORIES } from '../core/categories.js';

const SEVERITY_LABEL = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };
const STATUS = {
  confident: { label: 'Doğrulanmış sonuç', cls: 'ok', hint: 'Tüm bulgular sayfadaki metinden birebir alıntıyla doğrulandı.' },
  uncertain: { label: 'Belirsiz sonuç', cls: 'warn', hint: 'Sistem bu raporun eksik veya yanıltıcı olabileceğini düşünüyor. Skor yalnızca doğrulanmış maddelerden hesaplanır; gerçek risk daha yüksek olabilir. Nedenleri aşağıda.' },
  insufficient: { label: 'Yetersiz veri', cls: 'bad', hint: 'Güvenilir bir skor üretilemedi.' },
};

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

export function renderDisclaimer(text) {
  return el('div', { class: 'disclaimer', role: 'note', 'data-cy': 'disclaimer' },
    el('strong', { text: 'Hukuki tavsiye değildir. ' }), text);
}

/**
 * @param {HTMLElement} root
 * @param {object} report output of analyze()
 * @param {{onHighlight?: (segmentId: string) => void}} [handlers]
 */
export function renderReport(root, report, handlers = {}) {
  root.replaceChildren();
  const st = STATUS[report.status];
  root.append(
    el('section', { class: `score-card ${st.cls}`, 'data-cy': 'score-card', 'data-status': report.status },
      el('div', { class: 'score-row' },
        el('div', { class: 'score-num', 'data-cy': 'score' }, report.score ? String(report.score.value) : '—', el('span', { class: 'score-max', text: '/100' })),
        el('div', { class: 'score-meta' },
          el('div', { class: `band band-${report.score?.band.id || 'none'}`, text: report.score ? report.score.band.label : 'Skor yok' }),
          el('div', { class: `status status-${st.cls}`, 'data-cy': 'status', text: st.label }))),
      report.score ? el('div', { class: 'meter', 'aria-hidden': 'true' }, el('div', { class: 'meter-fill', style: `width:${report.score.value}%` })) : null,
      el('p', { class: 'status-hint', text: st.hint }),
      el('p', { class: 'provenance', text: provenance(report) })),
  );

  if (report.injection.detected || report.injection.model_reported) root.append(renderInjection(report.injection));

  const reasons = report.uncertainty.filter((r) => r.code !== 'injection');
  if (reasons.length) {
    root.append(el('section', { class: 'uncertainty', 'data-cy': 'uncertainty' },
      el('h3', { text: 'Bu rapordan neden emin değiliz?' }),
      el('ul', {}, reasons.map((r) => el('li', { class: r.minor ? 'minor' : '', 'data-code': r.code, text: r.message_tr })))));
  }

  root.append(el('section', { class: 'findings', 'data-cy': 'findings' },
    el('h3', { text: `Riskli maddeler (${report.findings.length})` }),
    report.findings.length ? report.findings.map((f) => renderFinding(f, handlers)) : el('p', { class: 'empty', text: 'Doğrulanmış riskli madde yok. Bu, metnin risksiz olduğu anlamına gelmez.' })));

  if (report.possible_misses.length) {
    root.append(el('details', { class: 'misses', 'data-cy': 'possible-misses', open: report.status === 'uncertain' },
      el('summary', { text: `Doğrulanmamış olası maddeler (${report.possible_misses.length})` }),
      el('p', { class: 'note', text: 'Anahtar kelime kuralları bu maddeleri işaretledi ama model raporlamadı. Skora dahil değildir; kendiniz okuyun.' }),
      report.possible_misses.map((f) => renderFinding({ ...f, flags: ['unverified'] }, handlers))));
  }

  if (report.not_assessable.length) {
    root.append(el('details', { class: 'not-assessable', 'data-cy': 'not-assessable', open: report.status !== 'confident' },
      el('summary', { text: `Değerlendirilemeyen konular (${report.not_assessable.length})` }),
      el('ul', {}, report.not_assessable.map((t) => el('li', { text: t })))));
  }

  if (report.rejected.length) {
    root.append(el('details', { class: 'rejected', 'data-cy': 'rejected' },
      el('summary', { text: `Doğrulamadan geçemeyen model iddiaları (${report.rejected.length})` }),
      el('p', { class: 'note', text: 'Bu iddialar orijinal metinde birebir alıntıyla desteklenmediği için rapordan çıkarıldı.' }),
      report.rejected.map((r) => el('div', { class: 'rejected-item', 'data-reject': r.reject_code },
        el('div', { class: 'reject-reason', text: `${CATEGORIES[r.category]?.label || r.category || '?'} — ${r.reject_reason}` }),
        el('blockquote', { class: 'struck', text: String(r.quote ?? '') })))));
  }

  root.append(el('footer', { class: 'report-footer' },
    el('span', { text: `Analiz edilen metin: ${report.coverage.segments_sent}/${report.coverage.segments_total} bölüm, ${report.coverage.chars_sent.toLocaleString('tr-TR')} karakter` }),
    report.injection.hidden_segment_count ? el('span', { text: ` · ${report.injection.hidden_segment_count} gizli bölüm dışarıda bırakıldı` }) : null));
}

function renderFinding(f, handlers) {
  const cat = CATEGORIES[f.category];
  const flags = f.flags || [];
  return el('article', { class: `finding sev-${f.severity}`, 'data-cy': 'finding', 'data-category': f.category },
    el('header', {},
      el('span', { class: `sev sev-${f.severity}`, text: SEVERITY_LABEL[f.severity] }),
      el('span', { class: 'cat', text: cat?.label || f.category })),
    el('blockquote', { class: 'quote', 'data-cy': 'quote' }, f.quote),
    el('p', { class: 'explain', text: f.explanation_tr }),
    el('div', { class: 'finding-foot' },
      flags.includes('low_confidence') || flags.includes('weak_support') ? el('span', { class: 'flag', text: 'düşük güven' }) : null,
      flags.includes('severity_raised') ? el('span', { class: 'flag', title: `Model: ${SEVERITY_LABEL[f.severity_from_model]}`, text: 'şiddet yükseltildi (enjeksiyon şüphesi)' }) : null,
      flags.includes('rule_only') ? el('span', { class: 'flag', text: 'yalnızca kural' }) : null,
      flags.includes('unverified') ? el('span', { class: 'flag', text: 'doğrulanmadı' }) : null,
      handlers.onHighlight ? el('button', { class: 'link', type: 'button', onclick: () => handlers.onHighlight(f.segment_id), text: 'Sayfada göster' }) : null));
}

function renderInjection(inj) {
  const hits = [...inj.hidden_hits.map((h) => ({ ...h, where: 'gizli metin' })), ...inj.visible_hits.map((h) => ({ ...h, where: 'görünür metin' }))];
  return el('section', { class: 'injection', 'data-cy': 'injection', role: 'alert' },
    el('h3', { text: 'Sayfa analiz aracını yönlendirmeye çalışıyor' }),
    el('p', { text: 'Bu metinler talimat olarak uygulanmadı: gizli metin modele hiç gönderilmedi, görünür talimat içeren bölümlerden alıntı kabul edilmedi ve skor modelden değil koddan hesaplandı.' }),
    inj.model_reported ? el('p', { class: 'note', text: 'Model de belgede kendisine yönelik talimat olduğunu bildirdi.' }) : null,
    el('ul', {}, hits.slice(0, 6).map((h) => el('li', {}, el('span', { class: 'where', text: `${h.where}: ` }), el('code', { text: h.excerpt.trim() })))));
}

function provenance(r) {
  if (r.mode === 'rules') return 'Kaynak: yalnızca anahtar kelime kuralları (LLM kullanılmadı).';
  return `Kaynak: ${r.provider.name}${r.provider.model ? ` · ${r.provider.model}` : ''} · ${new Date(r.analyzed_at).toLocaleString('tr-TR')}`;
}
