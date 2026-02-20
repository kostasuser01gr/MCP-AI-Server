/* ── Google Gemini provider adapter ──
 *  Gemini uses a different API format from OpenAI.
 */

import type { LLMRequest, LLMResponse, LLMStreamChunk } from '../types.js';

export class GeminiProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  private apiKey: string;
  public rateLimitRemaining = 100;
  public rateLimitReset = 0;
  public lastLatency = 0;
  public status: 'online' | 'degraded' | 'offline' = 'online';
  public requestCount = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const modelId = request.model || 'gemini-2.0-flash';

    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = request.messages.find((m) => m.role === 'system');

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } } : {}),
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 8192,
          },
        }),
      }
    );

    this.requestCount++;

    if (!res.ok) {
      const err = await res.text();
      this.status = res.status === 429 ? 'degraded' : 'offline';
      throw new Error(`Gemini error ${res.status}: ${err}`);
    }

    this.status = 'online';
    const data = await res.json();
    this.lastLatency = Date.now() - start;

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content: text,
      model: modelId,
      provider: this.id,
      tokens: {
        prompt: data.usageMetadata?.promptTokenCount || 0,
        completion: data.usageMetadata?.candidatesTokenCount || 0,
      },
      latencyMs: this.lastLatency,
    };
  }

  async *chatStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const start = Date.now();
    const modelId = request.model || 'gemini-2.0-flash';

    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = request.messages.find((m) => m.role === 'system');

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } } : {}),
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 8192,
          },
        }),
      }
    );

    this.requestCount++;

    if (!res.ok) {
      const err = await res.text();
      this.status = res.status === 429 ? 'degraded' : 'offline';
      yield { type: 'error', content: `Gemini error ${res.status}: ${err}` };
      return;
    }

    this.status = 'online';
    const reader = res.body?.getReader();
    if (!reader) { yield { type: 'error', content: 'No body' }; return; }

    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);

          try {
            const chunk = JSON.parse(payload);
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield { type: 'text', content: text, model: modelId, provider: this.id };
            }
            if (chunk.usageMetadata) {
              totalTokens = chunk.usageMetadata.candidatesTokenCount || 0;
            }
          } catch {
            // skip
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
      tokens: { prompt: 0, completion: totalTokens },
      latencyMs: this.lastLatency,
    };
  }
}
