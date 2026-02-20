/* ── Shared types ── */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'power_user' | 'user';
  preferredModel?: string;
  theme?: 'light' | 'dark' | 'system';
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  modelId: string;
  systemPrompt?: string;
  starred: boolean;
  tags: string[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  provider?: string;
  tokens?: { prompt: number; completion: number };
  latencyMs?: number;
  parentId?: string | null;
  createdAt: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextWindow: number;
  maxOutput: number;
  speed: 'instant' | 'fast' | 'medium';
  capabilities: ('chat' | 'code' | 'vision' | 'reasoning')[];
  free: boolean;
  enabled: boolean;
  rateLimit?: { rpm: number; rpd: number };
}

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  status: 'online' | 'degraded' | 'offline';
  models: AIModel[];
  rateLimitRemaining?: number;
}

export interface SystemInfo {
  os: string;
  browser: string;
  pwaInstallable: boolean;
  pwaInstalled: boolean;
  deviceType: 'desktop' | 'tablet' | 'mobile';
}

export interface UsageStats {
  totalMessages: number;
  totalTokens: number;
  totalConversations: number;
  messagesPerDay: { date: string; count: number }[];
  tokensByModel: { model: string; tokens: number }[];
  tokensByProvider: { provider: string; tokens: number }[];
  avgResponseTime: number;
  moneySaved: number;
}

export interface ProviderHealth {
  id: string;
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;
  rateLimitUsed: number;
  rateLimitMax: number;
  lastChecked: string;
}

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isShared: boolean;
  userId: string;
  usageCount: number;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  provider: string;
  keyPreview: string;
  isActive: boolean;
  addedBy: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  model?: string;
  systemPrompt?: string;
  parentMessageId?: string;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error' | 'info';
  content: string;
  model?: string;
  provider?: string;
  tokens?: { prompt: number; completion: number };
  latencyMs?: number;
}
