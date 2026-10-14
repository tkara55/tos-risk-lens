// Injected on demand (user clicks "Analiz et") into the active tab's ISOLATED world, so
// page scripts cannot tamper with this code or read results. Read-only: it never
// clicks, types or navigates. page-agent's PageController is used only for its DOM
// reading (getBrowserState); its action methods are never called.

import { PageController } from '@page-agent/page-controller';
import { canon } from '../core/normalize.js';
import { plainSegments, segmentDocument } from '../core/segment.js';
import { makeHiddenReason } from './visibility.js';

const HIGHLIGHT_CLASS = '__tos_lens_highlight';

async function extract() {
  // A 0x0 viewport (e.g. a never-rendered tab) makes every box zero-size; fall back to
  // style-only checks instead of declaring the whole page hidden.
  const geometry = window.innerWidth > 0 && window.innerHeight > 0;
  const { segments, hidden } = segmentDocument(document, { hiddenReason: makeHiddenReason(window, { geometry }) });
  const agent = await pageAgentView();

  // Cross-check: a segment is visible only if our CSS checks AND page-agent agree.
  const visible = [];
  if (agent.ok) {
    for (const seg of segments) {
      const probe = canon(seg.text).slice(0, 48);
      if (probe.length >= 12 && !agent.text.includes(probe)) {
        hidden.push({ ...seg, hiddenReason: 'page-agent-not-visible' });
      } else visible.push(seg);
    }
  } else visible.push(...segments);

  window.__tosLensElements = new Map([...visible, ...hidden].map((s) => [s.id, s.el]));
  return {
    url: location.href,
    title: document.title,
    lang: document.documentElement.lang || null,
    segments: plainSegments(visible),
    hidden: plainSegments(hidden),
    extractor: { pageAgent: agent.ok ? 'ok' : `failed: ${agent.error}`, pageAgentChars: agent.text.length },
  };
}

async function pageAgentView() {
  let controller;
  try {
    controller = new PageController({ viewportExpansion: -1, enableMask: false, highlightOpacity: 0, highlightLabelOpacity: 0 });
    const state = await controller.getBrowserState();
    const text = canon(stripAgentMarkup(state.content));
    return { ok: text.length > 0, text, error: text.length ? null : 'empty' };
  } catch (e) {
    return { ok: false, text: '', error: String(e && e.message || e) };
  } finally {
    try { await controller?.cleanUpHighlights(); controller?.dispose(); } catch { /* ignore */ }
  }
}

/** page-agent marks interactive elements like `[3]<a href=...>label />`; keep only text. */
export function stripAgentMarkup(s) {
  return String(s || '')
    .replace(/\[\d+\]<[a-zA-Z][^>\n]*>/g, ' ')
    .replace(/\s*\/>/g, ' ')
    .replace(/^\s*\*?\[\d+\]\s*/gm, ' ');
}

function highlight(segmentId) {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((n) => {
    n.classList.remove(HIGHLIGHT_CLASS);
    n.style.outline = '';
    n.style.backgroundColor = '';
  });
  const el = window.__tosLensElements?.get(segmentId);
  if (!el) return false;
  el.classList.add(HIGHLIGHT_CLASS);
  el.style.outline = '3px solid #e8590c';
  el.style.backgroundColor = 'rgba(255, 196, 0, 0.25)';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

// Exposed on the isolated-world window for chrome.scripting.executeScript({func}) calls
// and for the Cypress harness.
window.__tosLens = { extract, highlight };
