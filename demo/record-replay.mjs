// npm run demo:record — runs the real model on the three demo fixtures with your key and
// overwrites demo/replay/*.json with the recorded raw responses (origin: "recorded").
// After this, the Cypress video shows real model output instead of hand-written responses.
//
//   ANTHROPIC_API_KEY=sk-ant-... npm run demo:record
import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { analyze } from '../src/core/pipeline.js';
import { plainSegments, segmentDocument } from '../src/core/segment.js';
import { makeHiddenReason } from '../src/content/visibility.js';
import { anthropicProvider } from '../src/llm/anthropic.js';
import { recordingProvider } from '../src/llm/replay.js';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) { console.error('ANTHROPIC_API_KEY tanımlı değil'); process.exit(1); }
const model = process.env.MODEL || 'claude-opus-5-5';

for (const name of ['akistv-kosullar', 'bulutnot-gizlilik', 'hizlikargo-enjeksiyon']) {
  const dom = new JSDOM(readFileSync(`demo/fixtures/${name}.html`, 'utf8'));
  const { segments, hidden } = segmentDocument(dom.window.document, { hiddenReason: makeHiddenReason(dom.window, { geometry: false }) });
  const sink = [];
  const report = await analyze(
    { segments: plainSegments(segments), hidden: plainSegments(hidden), meta: { url: `https://demo.example/${name}`, title: dom.window.document.title } },
    recordingProvider(anthropicProvider({ apiKey: key, model }), sink),
  );
  writeFileSync(`demo/replay/${name}.json`, JSON.stringify({ origin: 'recorded', model, recorded_at: new Date().toISOString(), delayMs: 900, responses: sink.map((t) => { try { return JSON.parse(t); } catch { return t; } }) }, null, 1));
  console.log(`${name}: ${report.status}, skor ${report.score?.value ?? '—'}, ${report.findings.length} bulgu, ${report.rejected.length} reddedilen`);
}
