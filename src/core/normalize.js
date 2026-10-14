// Text normalization used for quote grounding. Deterministic and side-effect free:
// the same (quote, source) pair must always produce the same verdict.

const QUOTE_CHARS = /[‘’‚‛′´`]/g;
const DQUOTE_CHARS = /[“”„‟″«»]/g;
const DASH_CHARS = /[‐-―−]/g;
const INVISIBLE = /[​-‍⁠﻿­]/g;

/** Canonical form for comparison: NFKC, unified punctuation, collapsed whitespace, lowercase. */
export function canon(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(QUOTE_CHARS, "'")
    .replace(DQUOTE_CHARS, '"')
    .replace(DASH_CHARS, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-US')
    // Turkish dotted/dotless i are folded so "İptal" and "iptal" compare equal.
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i');
}

/** Collapse whitespace only (for display). */
export function squash(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

export function wordCount(text) {
  const t = squash(text);
  return t ? t.split(' ').length : 0;
}

/** Split a paragraph into sentences (good enough for EN/TR legal prose). */
export function sentences(text) {
  const t = squash(text);
  if (!t) return [];
  const parts = t.split(/(?<=[.!?;])\s+(?=[A-ZÇĞİÖŞÜ0-9"“(])/u);
  return parts.map((s) => s.trim()).filter(Boolean);
}
