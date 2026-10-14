// Human-visibility test for a block element, using computed style (+ geometry in a real
// browser). Anything a human would not see is excluded from the LLM input: that is
// where hidden prompt injections live (display:none, off-screen, same-colour, 1px text).

import { basicHidden } from '../core/segment.js';

export function makeHiddenReason(win, { geometry = true } = {}) {
  const doc = win.document;
  const cache = new WeakMap();
  const style = (el) => {
    if (!cache.has(el)) cache.set(el, win.getComputedStyle(el));
    return cache.get(el);
  };

  return (el) => {
    const basic = basicHidden(el);
    if (basic) return basic;
    for (let n = el; n && n.nodeType === 1 && n !== doc.documentElement; n = n.parentElement) {
      const cs = style(n);
      if (cs.display === 'none') return 'display-none';
      if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return 'visibility-hidden';
      if (cs.opacity !== '' && parseFloat(cs.opacity) < 0.05) return 'opacity';
      if ((cs.position === 'absolute' || cs.position === 'fixed') && (parseFloat(cs.left) < -500 || parseFloat(cs.top) < -500)) return 'offscreen';
      if (parseFloat(cs.textIndent) < -500) return 'offscreen';
      if (/inset\(50%\)/.test(cs.clipPath || '') || /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(cs.clip || '')) return 'clipped';
      if (geometry && (cs.overflow === 'hidden') && n !== el) {
        const r = n.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) return 'clipped-container';
      }
    }
    const cs = style(el);
    const fontSize = parseFloat(cs.fontSize);
    if (fontSize && fontSize < 5) return 'tiny-font';
    // Inline children may carry the trick (e.g. <span class=ghost> inside a <p>)
    for (const child of el.querySelectorAll('span,font,small,em,strong,b,i,a')) {
      const ccs = style(child);
      if ((child.textContent || '').trim().length > 20 && (parseFloat(ccs.fontSize) < 5 || lowContrast(ccs.color, background(child)))) return 'hidden-inline';
    }
    if (lowContrast(cs.color, background(el))) return 'low-contrast';
    if (geometry) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return 'zero-size';
    }
    return null;
  };

  function background(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = parseColor(style(n).backgroundColor);
      if (c && c[3] > 0.5) return c;
    }
    return [255, 255, 255, 1];
  }
}

function parseColor(s) {
  const m = String(s || '').match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}

function lowContrast(fg, bg) {
  const a = parseColor(fg);
  if (!a || !bg) return false;
  if (a[3] < 0.1) return true;
  const d = Math.abs(a[0] - bg[0]) + Math.abs(a[1] - bg[1]) + Math.abs(a[2] - bg[2]);
  return d < 30;
}
