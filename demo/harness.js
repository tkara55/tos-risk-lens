// Demo harness: the side-panel UI and pipeline, driven against fixture pages in an iframe.
// Exists because Cypress cannot drive a Chrome extension side panel. The code under test
// is the same: dist/extract.js is injected into the page, and the same analyze() and
// renderReport() run here. Only the LLM transport differs:
//   - default: replay of demo/replay/<fixture>.json (deterministic, labelled in the UI)
//   - live: window.__liveKey set (Cypress env ANTHROPIC_API_KEY) -> real Anthropic API

import { analyze, DISCLAIMER_TR } from '../src/core/pipeline.js';
import { anthropicProvider } from '../src/llm/anthropic.js';
import { replayProvider } from '../src/llm/replay.js';
import { renderDisclaimer, renderReport } from '../src/ui/report-view.js';

const $ = (id) => document.getElementById(id);
const frame = $('frame');
let fixture = null;

$('disclaimer').append(renderDisclaimer(DISCLAIMER_TR));
for (const btn of document.querySelectorAll('[data-fixture]')) btn.addEventListener('click', () => load(btn.dataset.fixture));
$('analyze').addEventListener('click', run);
load(new URLSearchParams(location.search).get('fixture') || 'akistv-kosullar');

function load(name) {
  fixture = name;
  for (const b of document.querySelectorAll('[data-fixture]')) b.setAttribute('aria-pressed', String(b.dataset.fixture === name));
  $('report').replaceChildren();
  $('error').hidden = true;
  frame.src = `/demo/fixtures/${name}.html`;
  updateMode();
}

function updateMode() {
  $('mode').textContent = window.__liveKey ? 'LLM: canlı (Anthropic API)' : 'LLM: kayıttan oynatma (demo/replay)';
}

async function run() {
  $('analyze').disabled = true;
  $('error').hidden = true;
  $('report').replaceChildren();
  updateMode();
  try {
    $('progress').textContent = 'Sayfa metni okunuyor…';
    const page = await extractFromFrame();
    const provider = window.__liveKey
      ? anthropicProvider({ apiKey: window.__liveKey, model: window.__liveModel || undefined })
      : replayProvider(await (await fetch(`/demo/replay/${fixture}.json`, { cache: 'no-store' })).json());
    const report = await analyze(
      { segments: page.segments, hidden: page.hidden, meta: { url: `https://demo.example/${fixture}`, title: page.title } },
      provider,
      { onProgress: (m) => { $('progress').textContent = m; } },
    );
    window.__lastReport = report;
    window.__lastPage = page;
    renderReport($('report'), report, { onHighlight: (id) => frame.contentWindow.__tosLens.highlight(id) });
    $('progress').textContent = '';
  } catch (e) {
    $('progress').textContent = '';
    $('error').hidden = false;
    $('error').textContent = `Analiz başarısız: ${e.message || e}`;
  } finally {
    $('analyze').disabled = false;
  }
}

async function extractFromFrame() {
  const win = frame.contentWindow;
  if (!win.__tosLens) {
    await new Promise((resolve, reject) => {
      const s = win.document.createElement('script');
      s.src = '/dist/extract.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('extract.js yüklenemedi'));
      win.document.head.append(s);
    });
  }
  return win.__tosLens.extract();
}
