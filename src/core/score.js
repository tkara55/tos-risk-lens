// Risk score is computed by code from *validated* findings only. The LLM never outputs
// a score, so a page cannot talk its way to "risk: 0".

const SEVERITY_WEIGHT = { high: 25, medium: 12, low: 5 };
const REPEAT_FACTOR = 0.2; // extra findings in an already-counted category
const WEAK_FACTOR = 0.5; // weak_support / low_confidence findings
const SCALE = 60;

export function computeScore(findings) {
  const byCategory = new Map();
  for (const f of findings) {
    const w = SEVERITY_WEIGHT[f.severity] * (f.flags?.some((x) => x === 'weak_support' || x === 'low_confidence') ? WEAK_FACTOR : 1);
    if (!byCategory.has(f.category)) byCategory.set(f.category, []);
    byCategory.get(f.category).push(w);
  }
  let raw = 0;
  for (const weights of byCategory.values()) {
    weights.sort((a, b) => b - a);
    raw += weights[0] + weights.slice(1).reduce((s, w) => s + w * REPEAT_FACTOR, 0);
  }
  const value = Math.round(100 * (1 - Math.exp(-raw / SCALE)));
  return { value, band: band(value), raw: Math.round(raw * 10) / 10 };
}

export function band(value) {
  if (value >= 60) return { id: 'high', label: 'Yüksek risk' };
  if (value >= 30) return { id: 'medium', label: 'Orta risk' };
  return { id: 'low', label: 'Düşük risk' };
}
