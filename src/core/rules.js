// Rule-based baseline detector. Deterministic, no network. Two jobs:
//   1. Baseline in the eval (what does a regex system catch/miss?).
//   2. Cross-check at runtime: categories the rules see but the LLM did not report are
//      surfaced as "olası kaçırılan" (possible misses) — shown, never scored.

import { CATEGORIES } from './categories.js';
import { canon, sentences } from './normalize.js';

/** Match against the raw sentence and its case-folded form (JS /i does not fold Turkish İ→i). */
export const matchesAny = (patterns, text) => {
  const folded = canon(text);
  return patterns.some((re) => re.test(text) || re.test(folded));
};

/**
 * @param {{id: string, text: string, kind: string}[]} segments
 * @returns {{category: string, segment_id: string, quote: string, severity: string, source: 'rule'}[]}
 */
export function ruleFindings(segments) {
  const out = [];
  for (const seg of segments) {
    if (seg.kind === 'heading') continue;
    for (const sentence of sentences(seg.text)) {
      for (const [category, def] of Object.entries(CATEGORIES)) {
        if (matchesAny(def.patterns, sentence)) {
          out.push({ category, segment_id: seg.id, quote: sentence.slice(0, 600), severity: def.defaultSeverity, source: 'rule' });
        }
      }
    }
  }
  return dedupe(out);
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((f) => {
    const key = `${f.category}|${f.segment_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
