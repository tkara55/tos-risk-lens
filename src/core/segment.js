// DOM -> numbered text segments. Shared by the content script (real browser,
// computed-style visibility) and the Node eval (jsdom, attribute-level visibility).
//
// Every segment carries a stable id ("s12"). The LLM may only cite segments by id,
// and every quote is checked against that segment's text by validate.js.

import { squash } from './normalize.js';

const BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,dt,dd,td,th,blockquote,pre,div,section,article,span';
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'IFRAME', 'BUTTON', 'SELECT', 'OPTION', 'TEXTAREA', 'INPUT']);
const CHROME_SELECTOR = 'nav,header,footer,aside,[role=navigation],[role=banner],[role=contentinfo],form';
const MAX_SEGMENT_CHARS = 2500;

/**
 * Attribute/inline-style visibility. Works in jsdom; the content script layers
 * computed-style and geometry checks on top (see content/extract.js).
 */
export function basicHidden(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    if (n.hidden || n.getAttribute('aria-hidden') === 'true') return 'hidden-attribute';
    const style = (n.getAttribute('style') || '').replace(/\s+/g, '').toLowerCase();
    if (/display:none|visibility:hidden|opacity:0(?![.\d])|font-size:0(?![.\d])/.test(style)) return 'inline-style';
    if (/(left|top|text-indent):-\d{3,}/.test(style)) return 'offscreen';
    if (/clip:rect\(0(px)?,0(px)?,0(px)?,0(px)?\)|clip-path:inset\(50%\)/.test(style)) return 'clipped';
  }
  return null;
}

/** Own text of a block, excluding text that belongs to nested block descendants. */
function ownBlockText(el, isBlock) {
  let out = '';
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) out += child.nodeValue;
      else if (child.nodeType === 1) {
        if (SKIP_TAGS.has(child.tagName.toUpperCase())) continue;
        if (isBlock(child)) { out += ' '; continue; }
        if (child.tagName === 'BR') { out += ' '; continue; }
        walk(child);
      }
    }
  };
  walk(el);
  return squash(out);
}

function splitLong(text) {
  if (text.length <= MAX_SEGMENT_CHARS) return [text];
  const parts = [];
  let buf = '';
  for (const s of text.split(/(?<=[.;:])\s+/)) {
    if ((buf + ' ' + s).length > MAX_SEGMENT_CHARS && buf) { parts.push(buf); buf = s; }
    else buf = buf ? buf + ' ' + s : s;
  }
  if (buf) parts.push(buf);
  return parts;
}

/**
 * @param {Document} doc
 * @param {object} [opts]
 * @param {(el: Element) => string|null} [opts.hiddenReason] returns a reason when the element is not visible to a human
 * @param {Element} [opts.root] restrict to a subtree (e.g. <main>)
 * @returns {{segments: Segment[], hidden: Segment[]}}
 *
 * @typedef {{id: string, text: string, kind: 'heading'|'text', hiddenReason?: string, el?: Element}} Segment
 */
export function segmentDocument(doc, opts = {}) {
  const hiddenReason = opts.hiddenReason || basicHidden;
  const root = opts.root || pickRoot(doc);
  const blockSet = new Set(root.querySelectorAll(BLOCK_SELECTOR));
  // spans are only blocks when they are not inline formatting inside a paragraph
  const isBlock = (el) => blockSet.has(el) && !(el.tagName === 'SPAN' && el.parentElement && el.parentElement.closest('p,li,td,dd'));
  const visible = [];
  const hidden = [];
  let n = 0;
  const candidates = [root, ...blockSet];
  for (const el of candidates) {
    if (!isBlock(el) && el !== root) continue;
    if (SKIP_TAGS.has(el.tagName.toUpperCase())) continue;
    if (el.closest(CHROME_SELECTOR) && !el.closest('main,article')) continue;
    const text = ownBlockText(el, isBlock);
    if (text.length < 2) continue;
    const kind = /^H[1-6]$/.test(el.tagName) ? 'heading' : 'text';
    const reason = hiddenReason(el);
    for (const part of splitLong(text)) {
      const seg = { id: `s${n++}`, text: part, kind, el };
      if (reason) { seg.hiddenReason = reason; hidden.push(seg); }
      else visible.push(seg);
    }
  }
  return { segments: dedupeAdjacent(visible), hidden };
}

function pickRoot(doc) {
  const candidates = ['main', 'article', '[role=main]', '#content', '.content'];
  for (const sel of candidates) {
    const el = doc.querySelector(sel);
    if (el && squash(el.textContent).length > 1500) return el;
  }
  return doc.body;
}

function dedupeAdjacent(segs) {
  const out = [];
  for (const s of segs) {
    const prev = out[out.length - 1];
    if (prev && prev.text === s.text) continue;
    out.push(s);
  }
  return out;
}

/** Serializable copy (drops DOM references). */
export function plainSegments(segs) {
  return segs.map(({ id, text, kind, hiddenReason }) => (hiddenReason ? { id, text, kind, hiddenReason } : { id, text, kind }));
}
