// Anthropic provider. The API key is the user's own, stored in chrome.storage.local and
// used only from the extension's service worker (never exposed to page scripts).
// The model gets no tools: it can only return JSON. It cannot click, navigate or run code.

import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = 'claude-opus-5-5';
// Models that accept the server-side refusal fallback ("default" routing).
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);

export class LlmError extends Error {
  constructor(code, message, retryable = true) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * @param {{apiKey: string, model?: string, effort?: 'low'|'medium'|'high'|'xhigh'|'max', fetch?: typeof fetch}} cfg
 */
export function anthropicProvider({ apiKey, model = DEFAULT_MODEL, effort = 'medium', fetch: customFetch }) {
  if (!apiKey) throw new LlmError('no_api_key', 'API anahtarı tanımlı değil', false);
  // dangerouslyAllowBrowser: the key belongs to the person running the extension, so
  // sending it from their own browser is the intended setup (no shared backend).
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2, ...(customFetch ? { fetch: customFetch } : {}) });

  return {
    name: 'anthropic',
    model,
    async complete({ system, user, schema }) {
      const params = {
        model,
        max_tokens: 32000,
        thinking: { type: 'adaptive' },
        output_config: { effort, format: { type: 'json_schema', schema } },
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: user }],
      };
      if (FALLBACK_MODELS.has(model)) {
        params.betas = ['server-side-fallback-2026-07-01'];
        params.fallbacks = 'default';
      }
      let msg;
      try {
        msg = await client.beta.messages.stream(params).finalMessage();
      } catch (e) {
        if (e instanceof Anthropic.AuthenticationError) throw new LlmError('auth', 'API anahtarı geçersiz', false);
        if (e instanceof Anthropic.PermissionDeniedError) throw new LlmError('permission', 'Bu anahtarın bu modele erişimi yok', false);
        if (e instanceof Anthropic.NotFoundError) throw new LlmError('model_not_found', `Model bulunamadı: ${model}`, false);
        if (e instanceof Anthropic.RateLimitError) throw new LlmError('rate_limit', 'Hız sınırına takıldı, biraz sonra tekrar deneyin');
        if (e instanceof Anthropic.APIConnectionError) throw new LlmError('network', 'API’ye bağlanılamadı');
        throw new LlmError('api', e.message || String(e));
      }
      if (msg.stop_reason === 'refusal') throw new LlmError('refusal', 'Model bu isteği yanıtlamayı reddetti', false);
      if (msg.stop_reason === 'max_tokens') throw new LlmError('max_tokens', 'Model çıktısı kesildi (çok uzun)');
      const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      return { text, model: msg.model, usage: msg.usage, stop_reason: msg.stop_reason };
    },
  };
}
