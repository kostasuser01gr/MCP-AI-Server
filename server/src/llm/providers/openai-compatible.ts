/* ── OpenAI-compatible provider adapter ──
 *  Works with Groq, Cerebras, Together, OpenRouter, Mistral, SambaNova
 *  — all expose an OpenAI-compatible /chat/completions endpoint.
 */

import type { LLMRequest, LLMResponse, LLMStreamChunk, ProviderConfig } from '../types.js';
import { logger } from '../../logger.js';

export class OpenAICompatibleProvider {
  readonly id: string;
  readonly name: string;
  private baseUrl: string;
  private apiKey: string;
  public rateLimitRemaining = 1000;
  public rateLimitReset = 0;
  public lastLatency = 0;
  public status: 'online' | 'degraded' | 'offline' = 'online';
  public requestCount = 0;

  constructor(config: ProviderConfig, apiKey: string) {
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.apiKey = apiKey;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const modelId = request.model || 'llama-3.3-70b-versatile';

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        stream: false,
      }),
    });

    this.updateRateLimits(res.headers);
    this.requestCount++;

    if (!res.ok) {
      const err = await res.text();
      this.status = res.status === 429 ? 'degraded' : 'offline';
      throw new Error(`${this.name} error ${res.status}: ${err}`);
    }

    this.status = 'online';
    const data = await res.json();
    this.lastLatency = Date.now() - start;

    return {
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || modelId,
      provider: this.id,
      tokens: {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
      },
      latencyMs: this.lastLatency,
    };
  }

  async *chatStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const start = Date.now();
    const modelId = request.model || 'llama-3.3-70b-versatile';

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        stream: true,
      }),
    });

    this.updateRateLimits(res.headers);
    this.requestCount++;

    if (!res.ok) {
      const err = await res.text();
      this.status = res.status === 429 ? 'degraded' : 'offline';
      yield { type: 'error', content: `${this.name} error ${res.status}: ${err}` };
      return;
    }

    this.status = 'online';

    const reader = res.body?.getReader();
    if (!reader) {
      yield { type: 'error', content: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let totalContent = '';
    let promptTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') continue;

          try {
            const chunk = JSON.parse(payload);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              totalContent += delta;
              yield {
                type: 'text',
                content: delta,
                model: chunk.model || modelId,
                provider: this.id,
              };
            }

            // Some providers include usage in the last chunk
            if (chunk.usage) {
              promptTokens = chunk.usage.prompt_tokens || 0;
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.lastLatency = Date.now() - start;

    yield {
      type: 'done',
      content: '',
      model: modelId,
      provider: this.id,
      tokens: {
        prompt: promptTokens,
        completion: totalContent.length > 0 ? Math.ceil(totalContent.length / 4) : 0,  // Rough estimate
      },
      latencyMs: this.lastLatency,
    };
  }

  private updateRateLimits(headers: Headers) {
    const remaining = headers.get('x-ratelimit-remaining-requests')
      || headers.get('x-ratelimit-remaining')
      || headers.get('ratelimit-remaining');
    if (remaining) {
      this.rateLimitRemaining = parseInt(remaining, 10);
      if (this.rateLimitRemaining <= 2) {
        this.status = 'degraded';
      }
    }

    const reset = headers.get('x-ratelimit-reset-requests')
      || headers.get('x-ratelimit-reset')
      || headers.get('ratelimit-reset');
    if (reset) {
      this.rateLimitReset = Date.now() + parseResetTime(reset);
    }
  }
}

function parseResetTime(val: string): number {
  // Some providers return seconds, some return ISO timestamps
  const num = parseFloat(val);
  if (!isNaN(num)) {
    // If it looks like a timestamp (>1000000000), treat as epoch seconds
    if (num > 1_000_000_000) return (num * 1000) - Date.now();
    return num * 1000; // seconds to ms
  }
  // Try ISO date
  const date = new Date(val).getTime();
  if (!isNaN(date)) return date - Date.now();
  return 60_000; // Default 1 minute
}
