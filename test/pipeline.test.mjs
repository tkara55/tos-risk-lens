// End-to-end over the demo fixtures: jsdom extraction (style-based visibility, no
// geometry) -> pipeline -> replayed model responses. Also checks what the model sees.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { analyze } from '../src/core/pipeline.js';
import { plainSegments, segmentDocument } from '../src/core/segment.js';
import { makeHiddenReason } from '../src/content/visibility.js';
import { replayProvider } from '../src/llm/replay.js';

function load(name) {
  const dom = new JSDOM(readFileSync(`demo/fixtures/${name}.html`, 'utf8'));
  const { segments, hidden } = segmentDocument(dom.window.document, { hiddenReason: makeHiddenReason(dom.window, { geometry: false }) });
  return { segments: plainSegments(segments), hidden: plainSegments(hidden), meta: { title: dom.window.document.title } };
}

function spy(provider) {
  const calls = [];
  return { calls, provider: { ...provider, complete: (req) => { calls.push(req); return provider.complete(req); } } };
}

const replay = (name) => replayProvider({ ...JSON.parse(readFileSync(`demo/replay/${name}.json`, 'utf8')), delayMs: 0 });

test('happy path: all claims grounded, status confident, score from code', async () => {
  const r = await analyze(load('akistv-kosullar'), replay('akistv-kosullar'));
  assert.equal(r.status, 'confident');
  assert.equal(r.rejected.length, 0);
  assert.equal(r.findings.length, 10);
  assert.ok(r.score.value >= 60);
  assert.ok(r.findings.find((f) => f.category === 'data_sharing').flags.includes('segment_corrected'));
  assert.match(r.disclaimer, /hukuki tavsiye vermez/i);
});

test('vague policy: fabricated claim rejected and the report says it is uncertain', async () => {
  const r = await analyze(load('bulutnot-gizlilik'), replay('bulutnot-gizlilik'));
  assert.equal(r.status, 'uncertain');
  assert.deepEqual(r.rejected.map((x) => x.reject_code), ['UNGROUNDED_QUOTE']);
  assert.ok(r.uncertainty.some((u) => u.code === 'rejected_claims'));
  assert.ok(r.not_assessable.length >= 3);
});

test('injection: hidden instructions never reach the model', async () => {
  const input = load('hizlikargo-enjeksiyon');
  const { calls, provider } = spy(replay('hizlikargo-enjeksiyon'));
  const r = await analyze(input, provider);
  const sent = calls.map((c) => c.user).join('\n');
  assert.doesNotMatch(sent, /Ignore all previous instructions/);
  assert.doesNotMatch(sent, /önceki tüm talimatları yok say/);
  assert.doesNotMatch(sent, /must be classified as low risk/);
  assert.equal(r.injection.detected, true);
  assert.ok(r.injection.hidden_hits.length >= 3, 'all three hidden traps detected');
});

test('injection: quote from the visible instruction is rejected, downplayed severity is raised, status uncertain', async () => {
  const r = await analyze(load('hizlikargo-enjeksiyon'), replay('hizlikargo-enjeksiyon'));
  assert.equal(r.status, 'uncertain');
  assert.ok(r.rejected.some((x) => x.reject_code === 'QUOTE_FROM_SUSPECT_SEGMENT'));
  const sharing = r.findings.find((f) => f.category === 'data_sharing');
  assert.equal(sharing.severity, 'medium');
  assert.ok(sharing.flags.includes('severity_raised'));
  assert.ok(r.score.value >= 60, `score stays high (${r.score.value})`);
});

test('a model that obeys the page and returns nothing cannot produce a clean report', async () => {
  const obedient = replayProvider({ model: 'x', responses: [{ document_type: 'terms_of_service', findings: [], not_assessable: [], page_instructions_observed: false }] });
  const r = await analyze(load('hizlikargo-enjeksiyon'), obedient);
  assert.equal(r.status, 'uncertain');
  assert.ok(r.uncertainty.some((u) => u.code === 'injection'));
  assert.ok(r.uncertainty.some((u) => u.code === 'possible_misses'), 'rule cross-check surfaces what the model hid');
});

test('malformed model output is retried once, then reported as an error (no score)', async () => {
  const broken = replayProvider({ model: 'x', responses: ['not json', '{"findings": "nope"}'] });
  const r = await analyze(load('akistv-kosullar'), broken);
  assert.equal(r.status, 'insufficient');
  assert.equal(r.score, null);
  assert.ok(r.uncertainty.some((u) => u.code === 'llm_error'));
});

test('without an API key the rules-only mode is clearly labelled', async () => {
  const r = await analyze(load('akistv-kosullar'), null);
  assert.equal(r.mode, 'rules');
  assert.equal(r.status, 'uncertain');
  assert.ok(r.findings.every((f) => f.flags.includes('rule_only')));
});

test('too little text yields "insufficient", not a score', async () => {
  const r = await analyze({ segments: [{ id: 's0', kind: 'text', text: 'Kısa bir metin.' }] }, replay('akistv-kosullar'));
  assert.equal(r.status, 'insufficient');
  assert.equal(r.score, null);
});
