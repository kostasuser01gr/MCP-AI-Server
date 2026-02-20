/* ── LLM Types ── */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMStreamChunk {
  type: 'text' | 'done' | 'error';
  content: string;
  model?: string;
  provider?: string;
  tokens?: { prompt: number; completion: number };
  latencyMs?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  tokens: { prompt: number; completion: number };
  latencyMs: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  models: ModelConfig[];
  enabled: boolean;
}

export interface ModelConfig {
  id: string;
  name: string;
  providerId: string;
  providerModelId: string;  // The actual model ID sent to the API
  description: string;
  contextWindow: number;
  maxOutput: number;
  speed: 'instant' | 'fast' | 'medium';
  capabilities: ('chat' | 'code' | 'vision' | 'reasoning')[];
  free: boolean;
  priority: number;  // Lower = higher priority for auto-selection
}

export interface ProviderInstance {
  id: string;
  config: ProviderConfig;
  apiKey: string | null;
  rateLimitRemaining: number;
  rateLimitReset: number;
  lastLatency: number;
  status: 'online' | 'degraded' | 'offline';
  requestCount: number;

  chat(request: LLMRequest): Promise<LLMResponse>;
  chatStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk>;
}
