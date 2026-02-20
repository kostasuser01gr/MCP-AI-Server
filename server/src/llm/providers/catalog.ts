/* ── Provider Catalog: all free cloud AI providers ── */

import type { ProviderConfig } from '../types.js';

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    enabled: true,
    models: [
      {
        id: 'groq-llama-3.3-70b',
        name: 'Llama 3.3 70B',
        providerId: 'groq',
        providerModelId: 'llama-3.3-70b-versatile',
        description: 'Fast, high-quality general-purpose model',
        contextWindow: 128000,
        maxOutput: 32768,
        speed: 'instant',
        capabilities: ['chat', 'code', 'reasoning'],
        free: true,
        priority: 1,
      },
      {
        id: 'groq-llama-3.1-8b',
        name: 'Llama 3.1 8B',
        providerId: 'groq',
        providerModelId: 'llama-3.1-8b-instant',
        description: 'Ultra-fast for short tasks',
        contextWindow: 131072,
        maxOutput: 8192,
        speed: 'instant',
        capabilities: ['chat', 'code'],
        free: true,
        priority: 2,
      },
      {
        id: 'groq-mixtral-8x7b',
        name: 'Mixtral 8x7B',
        providerId: 'groq',
        providerModelId: 'mixtral-8x7b-32768',
        description: 'Strong mixture-of-experts model',
        contextWindow: 32768,
        maxOutput: 32768,
        speed: 'instant',
        capabilities: ['chat', 'code'],
        free: true,
        priority: 3,
      },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GEMINI_API_KEY',
    enabled: true,
    models: [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        providerId: 'gemini',
        providerModelId: 'gemini-2.0-flash',
        description: 'Fast multimodal model with 1M context',
        contextWindow: 1048576,
        maxOutput: 8192,
        speed: 'fast',
        capabilities: ['chat', 'code', 'vision', 'reasoning'],
        free: true,
        priority: 4,
      },
      {
        id: 'gemini-2.0-flash-thinking',
        name: 'Gemini 2.0 Flash Thinking',
        providerId: 'gemini',
        providerModelId: 'gemini-2.0-flash-thinking-exp',
        description: 'Chain-of-thought reasoning model',
        contextWindow: 1048576,
        maxOutput: 8192,
        speed: 'medium',
        capabilities: ['chat', 'reasoning'],
        free: true,
        priority: 8,
      },
    ],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    enabled: true,
    models: [
      {
        id: 'cerebras-llama-3.3-70b',
        name: 'Llama 3.3 70B (Cerebras)',
        providerId: 'cerebras',
        providerModelId: 'llama-3.3-70b',
        description: 'Fastest inference available (~2000 tok/s)',
        contextWindow: 128000,
        maxOutput: 8192,
        speed: 'instant',
        capabilities: ['chat', 'code', 'reasoning'],
        free: true,
        priority: 0,  // Highest priority — fastest
      },
    ],
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    baseUrl: 'https://api.sambanova.ai/v1',
    apiKeyEnv: 'SAMBANOVA_API_KEY',
    enabled: true,
    models: [
      {
        id: 'sambanova-llama-3.1-405b',
        name: 'Llama 3.1 405B',
        providerId: 'sambanova',
        providerModelId: 'Meta-Llama-3.1-405B-Instruct',
        description: 'Largest free model — maximum quality',
        contextWindow: 16384,
        maxOutput: 4096,
        speed: 'medium',
        capabilities: ['chat', 'code', 'reasoning'],
        free: true,
        priority: 10,
      },
    ],
  },
  {
    id: 'together',
    name: 'Together.ai',
    baseUrl: 'https://api.together.xyz/v1',
    apiKeyEnv: 'TOGETHER_API_KEY',
    enabled: true,
    models: [
      {
        id: 'together-llama-3.1-70b',
        name: 'Llama 3.1 70B (Together)',
        providerId: 'together',
        providerModelId: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        description: 'Fast 70B model via Together',
        contextWindow: 131072,
        maxOutput: 4096,
        speed: 'fast',
        capabilities: ['chat', 'code'],
        free: true,
        priority: 5,
      },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    enabled: true,
    models: [
      {
        id: 'openrouter-llama-3.1-8b-free',
        name: 'Llama 3.1 8B (OpenRouter)',
        providerId: 'openrouter',
        providerModelId: 'meta-llama/llama-3.1-8b-instruct:free',
        description: 'Free model via OpenRouter aggregator',
        contextWindow: 131072,
        maxOutput: 4096,
        speed: 'fast',
        capabilities: ['chat', 'code'],
        free: true,
        priority: 7,
      },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    enabled: true,
    models: [
      {
        id: 'mistral-small',
        name: 'Mistral Small',
        providerId: 'mistral',
        providerModelId: 'mistral-small-latest',
        description: 'Fast, multilingual model from Mistral',
        contextWindow: 128000,
        maxOutput: 8192,
        speed: 'fast',
        capabilities: ['chat', 'code'],
        free: true,
        priority: 6,
      },
    ],
  },
];

export function getAllModels() {
  return PROVIDERS.flatMap((p) =>
    p.models.map((m) => ({ ...m, providerName: p.name, providerEnabled: p.enabled }))
  );
}

export function getProviderById(id: string) {
  return PROVIDERS.find((p) => p.id === id);
}

export function getModelById(id: string) {
  for (const p of PROVIDERS) {
    const model = p.models.find((m) => m.id === id);
    if (model) return { model, provider: p };
  }
  return null;
}
