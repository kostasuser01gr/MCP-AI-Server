/* ── Smart AI Router ──
 *  Picks the best available free provider based on:
 *  1. Explicit model selection
 *  2. Rate limit availability
 *  3. Provider priority (speed-based)
 *  4. Auto-fallback on failure
 */

import { OpenAICompatibleProvider } from './providers/openai-compatible.js';
import { GeminiProvider } from './providers/gemini.js';
import { PROVIDERS, getModelById, getAllModels } from './providers/catalog.js';
import type { LLMRequest, LLMResponse, LLMStreamChunk, ModelConfig, ProviderConfig } from './types.js';
import { logger } from '../logger.js';

type AnyProvider = OpenAICompatibleProvider | GeminiProvider;

class AIRouter {
  private providers = new Map<string, AnyProvider>();
  private initialized = false;

  /** Initialize providers from environment variables or DB keys */
  init(customKeys?: Record<string, string>) {
    for (const config of PROVIDERS) {
      const key = customKeys?.[config.id]
        || process.env[config.apiKeyEnv]
        || '';

      if (!key) {
        logger.debug(`No API key for ${config.name} (${config.apiKeyEnv}), skipping`);
        continue;
      }

      if (config.id === 'gemini') {
        this.providers.set(config.id, new GeminiProvider(key));
      } else {
        this.providers.set(config.id, new OpenAICompatibleProvider(config, key));
      }

      logger.info(`Registered provider: ${config.name}`);
    }

    this.initialized = true;
    logger.info(`AI Router initialized with ${this.providers.size} providers`);
  }

  /** Add or update a provider key at runtime */
  addProvider(providerId: string, apiKey: string) {
    const config = PROVIDERS.find((p) => p.id === providerId);
    if (!config) throw new Error(`Unknown provider: ${providerId}`);

    if (providerId === 'gemini') {
      this.providers.set(providerId, new GeminiProvider(apiKey));
    } else {
      this.providers.set(providerId, new OpenAICompatibleProvider(config, apiKey));
    }
    logger.info(`Provider added/updated: ${config.name}`);
  }

  removeProvider(providerId: string) {
    this.providers.delete(providerId);
  }

  /** Non-streaming chat */
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const { provider, model } = this.selectProvider(request.model);

    const llmRequest: LLMRequest = {
      ...request,
      model: model.providerModelId,
    };

    try {
      return await provider.chat(llmRequest);
    } catch (err) {
      logger.warn(`Provider ${provider.id} failed, trying fallback: ${(err as Error).message}`);
      // Try fallback
      const fallback = this.getFallbackProvider(provider.id);
      if (fallback) {
        const fbModel = this.getDefaultModel(fallback.id);
        return await fallback.chat({ ...request, model: fbModel?.providerModelId });
      }
      throw err;
    }
  }

  /** Streaming chat with auto-fallback */
  async *chatStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const { provider, model } = this.selectProvider(request.model);

    const llmRequest: LLMRequest = {
      ...request,
      model: model.providerModelId,
    };

    let hadError = false;

    try {
      for await (const chunk of provider.chatStream(llmRequest)) {
        if (chunk.type === 'error') {
          hadError = true;
          logger.warn(`Provider ${provider.id} stream error: ${chunk.content}`);
          break;
        }
        yield chunk;
      }
    } catch (err) {
      hadError = true;
      logger.warn(`Provider ${provider.id} stream failed: ${(err as Error).message}`);
    }

    // Auto-fallback on error
    if (hadError) {
      const fallback = this.getFallbackProvider(provider.id);
      if (fallback) {
        const fbModel = this.getDefaultModel(fallback.id);
        yield { type: 'text', content: '\n\n---\n*Switched to fallback model*\n\n', provider: fallback.id, model: fbModel?.name };

        for await (const chunk of fallback.chatStream({ ...request, model: fbModel?.providerModelId })) {
          yield chunk;
        }
      } else {
        yield { type: 'error', content: 'All providers unavailable. Please try again later.' };
      }
    }
  }

  /** Select the best provider and model for a request */
  private selectProvider(requestedModelId?: string): { provider: AnyProvider; model: ModelConfig } {
    if (!this.initialized || this.providers.size === 0) {
      throw new Error('No AI providers available. Add API keys in Admin → API Keys.');
    }

    // If specific model requested, find its provider
    if (requestedModelId) {
      const found = getModelById(requestedModelId);
      if (found) {
        const provider = this.providers.get(found.provider.id);
        if (provider && provider.rateLimitRemaining > 0) {
          return { provider, model: found.model };
        }
        // Provider not available, fall through to auto-select
      }
    }

    // Auto-select: sort available models by priority (speed), pick first available
    const allModels = getAllModels()
      .filter((m) => m.free && m.providerEnabled)
      .sort((a, b) => a.priority - b.priority);

    for (const model of allModels) {
      const provider = this.providers.get(model.providerId);
      if (provider && provider.status !== 'offline' && provider.rateLimitRemaining > 0) {
        return { provider, model };
      }
    }

    // Last resort: pick any available provider
    const firstProvider = [...this.providers.values()][0];
    if (firstProvider) {
      const defaultModel = this.getDefaultModel(firstProvider.id);
      if (defaultModel) {
        return { provider: firstProvider, model: defaultModel };
      }
    }

    throw new Error('All providers are rate-limited or offline. Please wait and try again.');
  }

  private getFallbackProvider(excludeId: string): AnyProvider | null {
    const allModels = getAllModels()
      .filter((m) => m.free && m.providerId !== excludeId)
      .sort((a, b) => a.priority - b.priority);

    for (const model of allModels) {
      const provider = this.providers.get(model.providerId);
      if (provider && provider.status !== 'offline' && provider.rateLimitRemaining > 0) {
        return provider;
      }
    }
    return null;
  }

  private getDefaultModel(providerId: string): ModelConfig | undefined {
    return getAllModels().find((m) => m.providerId === providerId);
  }

  /** Get available models for the API */
  getAvailableModels() {
    return getAllModels().map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.providerName,
      description: m.description,
      contextWindow: m.contextWindow,
      maxOutput: m.maxOutput,
      speed: m.speed,
      capabilities: m.capabilities,
      free: m.free,
      enabled: this.providers.has(m.providerId),
      rateLimit: undefined,
    }));
  }

  /** Get provider health status */
  getProviderHealth() {
    return PROVIDERS.map((config) => {
      const instance = this.providers.get(config.id);
      return {
        id: config.id,
        name: config.name,
        status: instance?.status || 'offline' as const,
        latencyMs: instance?.lastLatency || 0,
        rateLimitUsed: instance?.requestCount || 0,
        rateLimitMax: instance?.rateLimitRemaining ? instance.requestCount + instance.rateLimitRemaining : 0,
        lastChecked: new Date().toISOString(),
      };
    });
  }
}

// Singleton
export const aiRouter = new AIRouter();
