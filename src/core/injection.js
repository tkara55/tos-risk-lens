// Prompt-injection detection on page text. Deterministic pattern scan; it does not try to
// be complete. The real defenses are structural (see README "Güvenlik"):
//   - hidden DOM text never reaches the LLM,
//   - the LLM has no tools and cannot act on the page,
//   - the score is computed by code, not by the LLM,
//   - every claim must quote a visible, non-suspect segment verbatim.
// This scan exists so the user is *told* that the page tried something.

const PATTERNS = [
  { id: 'ignore_instructions', re: /\b(ignore|disregard|forget|override)\b[^.]{0,40}\b(previous|prior|above|all|earlier|system)\b[^.]{0,30}\b(instructions?|prompts?|rules?|directions?)/i },
  { id: 'role_hijack', re: /\b(you are now|act as|pretend to be|from now on,? you)\b/i },
  { id: 'system_marker', re: /(^|\s)(system|assistant|developer)\s*:|<\/?(system|assistant|instructions?|document)>|\[\/?INST\]|<\|im_start\|>|###\s*(system|instruction)/i },
  { id: 'score_manipulation', re: /\b(risk[_ ]?score|score|rating)\b[^.]{0,40}\b(0|zero|low|safe|minimum)\b|\b(report|return|output|say)\b[^.]{0,30}\b(no|zero)\b[^.]{0,20}\b(risks?|issues|findings)\b/i },
  { id: 'reviewer_address', re: /\b(AI|LLM|language model|assistant|analy[sz]er|summari[sz]er)\b[^.]{0,60}\b(must|should|shall|need to)\b[^.]{0,60}\b(classify|mark|report|treat|consider|say)\b/i },
  { id: 'tr_ignore', re: /(önceki|yukarıdaki|tüm|bütün)[^.]{0,30}(talimat|komut|kural)[^.]{0,30}(yok say|unut|dikkate alma|görmezden gel)/i },
  { id: 'tr_score', re: /(risk (skoru|puanı)|skor)[^.]{0,40}(0|sıfır|düşük)[^.]{0,20}(ver|yaz|olarak|göster|olmalı)/i },
  { id: 'tr_ai_address', re: /(yapay zek[aâ]|asistan|model|analiz aracı)[^.]{0,60}(şunu yap|raporla|söyle|belirt|sınıflandır)/i },
];

/**
 * @param {{id: string, text: string}[]} segments
 * @returns {{segment_id: string, pattern: string, excerpt: string}[]}
 */
export function scanInjection(segments) {
  const hits = [];
  for (const seg of segments) {
    const matched = PATTERNS.filter(({ re }) => re.test(seg.text)).map(({ id }) => id);
    if (matched.length) hits.push({ segment_id: seg.id, pattern: matched.join(','), excerpt: seg.text.slice(0, 220) });
  }
  return hits;
}

/** Hidden segments that look like instructions are the strongest signal. */
export function assessInjection(visibleSegments, hiddenSegments) {
  const visibleHits = scanInjection(visibleSegments);
  const hiddenHits = scanInjection(hiddenSegments);
  const suspectIds = new Set(visibleHits.map((h) => h.segment_id));
  return {
    detected: visibleHits.length > 0 || hiddenHits.length > 0,
    visibleHits,
    hiddenHits,
    hiddenSegmentCount: hiddenSegments.length,
    hiddenChars: hiddenSegments.reduce((n, s) => n + s.text.length, 0),
    suspectIds,
  };
}
