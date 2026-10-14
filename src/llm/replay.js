// Replay provider: returns pre-recorded model responses. Used by unit tests, the Cypress
// demo and offline eval re-runs so they are deterministic and need no API key.
// Responses are recorded from the real API with `npm run demo:record` (see README);
// files whose `origin` is "handwritten" were authored by hand to exercise specific
// failure modes (fabricated quote, obeying an injected instruction) and are labeled so.

export function replayProvider(recording) {
  const responses = [...recording.responses];
  return {
    name: 'replay',
    model: `${recording.model || 'unknown'} (${recording.origin === 'handwritten' ? 'el yazımı yanıt' : 'kayıttan oynatma'})`,
    async complete() {
      if (!responses.length) throw Object.assign(new Error('Kayıtta başka yanıt yok'), { code: 'replay_exhausted', retryable: false });
      const next = responses.shift();
      if (recording.delayMs) await new Promise((r) => setTimeout(r, recording.delayMs));
      return { text: typeof next === 'string' ? next : JSON.stringify(next), model: recording.model, stop_reason: 'end_turn' };
    },
  };
}

/** Wraps a provider and records every raw response (used by demo/record-replay.mjs). */
export function recordingProvider(inner, sink) {
  return {
    ...inner,
    async complete(req) {
      const res = await inner.complete(req);
      sink.push(res.text);
      return res;
    },
  };
}
