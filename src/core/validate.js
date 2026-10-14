// Deterministic validation of LLM output. Nothing the model says reaches the user
// unless it passes these checks. Each rejected claim keeps a machine-readable reason
// so the UI (and the eval) can show *why* it was dropped.

import { CATEGORIES } from './categories.js';
import { canon, wordCount } from './normalize.js';
import { matchesAny } from './rules.js';
import { LLM_OUTPUT_SCHEMA, validateSchema } from './schema.js';

export const REJECT = {
  SCHEMA: 'Şemaya uymuyor',
  QUOTE_TOO_SHORT: 'Alıntı çok kısa (en az 6 kelime gerekir)',
  UNGROUNDED_QUOTE: 'Alıntı sayfa metninde birebir bulunamadı',
  QUOTE_FROM_SUSPECT_SEGMENT: 'Alıntı, talimat içeren şüpheli bir bölümden',
  QUOTE_IS_HEADING: 'Alıntı yalnızca bir başlık',
  DUPLICATE: 'Aynı madde zaten raporlandı',
};

const MIN_QUOTE_WORDS = 6;

/**
 * @param {unknown} raw parsed JSON from the model
 * @param {{id: string, text: string, kind: string}[]} segments visible segments sent to the model
 * @param {{suspectIds?: Set<string>}} [ctx]
 */
export function validateLlmOutput(raw, segments, ctx = {}) {
  const suspectIds = ctx.suspectIds || new Set();
  const envelopeErrors = validateEnvelope(raw);
  if (envelopeErrors.length) return { ok: false, errors: envelopeErrors, accepted: [], rejected: [] };

  const byId = new Map(segments.map((s) => [s.id, { ...s, canon: canon(s.text) }]));
  const all = [...byId.values()];
  const findingSchema = LLM_OUTPUT_SCHEMA.properties.findings.items;
  const accepted = [];
  const rejected = [];

  for (const f of raw.findings) {
    const reject = (code, extra = {}) => rejected.push({ ...f, reject_code: code, reject_reason: REJECT[code], ...extra });

    const schemaErrors = validateSchema(f, findingSchema, 'finding');
    if (schemaErrors.length) { reject('SCHEMA', { detail: schemaErrors.join('; ') }); continue; }

    const q = canon(stripEllipsis(f.quote));
    if (wordCount(q) < MIN_QUOTE_WORDS) { reject('QUOTE_TOO_SHORT'); continue; }

    // Grounding: claimed segment first, then any segment (model may cite the wrong id).
    let seg = byId.get(f.segment_id);
    let segmentCorrected = false;
    if (!seg || !seg.canon.includes(q)) {
      seg = all.find((s) => s.canon.includes(q));
      segmentCorrected = Boolean(seg);
    }
    if (!seg) { reject('UNGROUNDED_QUOTE'); continue; }
    if (suspectIds.has(seg.id)) { reject('QUOTE_FROM_SUSPECT_SEGMENT', { segment_id: seg.id }); continue; }
    if (seg.kind === 'heading') { reject('QUOTE_IS_HEADING', { segment_id: seg.id }); continue; }

    const support = matchesAny(CATEGORIES[f.category].support, f.quote) || matchesAny(CATEGORIES[f.category].support, seg.text);
    const dupe = accepted.find((a) => a.category === f.category && a.segment_id === seg.id);
    if (dupe) { reject('DUPLICATE', { segment_id: seg.id }); continue; }

    accepted.push({
      category: f.category,
      severity: f.severity,
      segment_id: seg.id,
      quote: f.quote,
      explanation_tr: sanitizeExplanation(f.explanation_tr),
      confidence: f.confidence,
      flags: [
        ...(segmentCorrected ? ['segment_corrected'] : []),
        ...(support ? [] : ['weak_support']),
        ...(f.confidence === 'low' ? ['low_confidence'] : []),
      ],
      source: 'llm',
    });
  }

  return {
    ok: true,
    errors: [],
    document_type: raw.document_type,
    not_assessable: raw.not_assessable.map(sanitizeExplanation),
    page_instructions_observed: raw.page_instructions_observed,
    accepted,
    rejected,
  };
}

/** Validate everything except individual findings (those are judged one by one). */
function validateEnvelope(raw) {
  if (typeof raw !== 'object' || raw === null) return ['$: JSON nesnesi değil'];
  const { findings, ...rest } = raw;
  const envelopeSchema = { ...LLM_OUTPUT_SCHEMA, properties: { ...LLM_OUTPUT_SCHEMA.properties, findings: { type: 'array', items: {} } } };
  const errs = validateSchema({ ...rest, findings: Array.isArray(findings) ? [] : findings }, envelopeSchema);
  return errs;
}

/** "...", "…" at the ends are allowed; an ellipsis in the middle means a stitched quote and will fail grounding. */
function stripEllipsis(q) {
  return String(q).replace(/^\s*(\.\.\.|…)\s*/, '').replace(/\s*(\.\.\.|…)\s*$/, '').replace(/^["“'‘]|["”'’]$/g, '');
}

/** Explanations are rendered as text only; also drop URLs so the model cannot plant links. */
function sanitizeExplanation(s) {
  return String(s).replace(/https?:\/\/\S+/gi, '[bağlantı kaldırıldı]').replace(/[<>]/g, '').trim();
}
