/* ── API client for the backend ── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';

interface FetchOptions extends RequestInit {
  json?: unknown;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async fetch<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
    const { json, headers: extraHeaders, ...rest } = opts;
    const headers: Record<string, string> = {
      ...(extraHeaders as Record<string, string>),
    };

    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (json) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      body: json ? JSON.stringify(json) : rest.body,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(res.status, error.message || 'Request failed');
    }

    if (res.headers.get('content-type')?.includes('application/json')) {
      return res.json();
    }
    return undefined as T;
  }

  /* ── Auth ── */
  async signup(data: { email: string; password: string; name: string }) {
    return this.fetch<{ user: import('@/types').User; token: string }>('/api/v1/auth/signup', {
      method: 'POST', json: data,
    });
  }

  async login(data: { email: string; password: string }) {
    return this.fetch<{ user: import('@/types').User; token: string }>('/api/v1/auth/login', {
      method: 'POST', json: data,
    });
  }

  async getMe() {
    return this.fetch<{ user: import('@/types').User }>('/api/v1/auth/me');
  }

  async updateProfile(data: Partial<import('@/types').User>) {
    return this.fetch<{ user: import('@/types').User }>('/api/v1/auth/me', {
      method: 'PATCH', json: data,
    });
  }

  /* ── Chat ── */
  async getConversations() {
    return this.fetch<{ conversations: import('@/types').Conversation[] }>('/api/v1/conversations');
  }

  async getConversation(id: string) {
    return this.fetch<{ conversation: import('@/types').Conversation; messages: import('@/types').Message[] }>(
      `/api/v1/conversations/${id}`
    );
  }

  async createConversation(data: { title?: string; modelId?: string; systemPrompt?: string }) {
    return this.fetch<{ conversation: import('@/types').Conversation }>('/api/v1/conversations', {
      method: 'POST', json: data,
    });
  }

  async deleteConversation(id: string) {
    return this.fetch(`/api/v1/conversations/${id}`, { method: 'DELETE' });
  }

  async updateConversation(id: string, data: Partial<import('@/types').Conversation>) {
    return this.fetch<{ conversation: import('@/types').Conversation }>(
      `/api/v1/conversations/${id}`, { method: 'PATCH', json: data }
    );
  }

  streamChat(data: import('@/types').ChatRequest): { stream: ReadableStream<string>; abort: () => void } {
    const controller = new AbortController();
    const token = this.getToken();

    const stream = new ReadableStream<string>({
      async start(streamController) {
        try {
          const res = await fetch(`${API_BASE}/api/v1/chat/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
            signal: controller.signal,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Stream failed' }));
            streamController.enqueue(JSON.stringify({ type: 'error', content: err.message }));
            streamController.close();
            return;
          }

          const reader = res.body?.getReader();
          if (!reader) { streamController.close(); return; }
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n').filter((l) => l.startsWith('data: '));
            for (const line of lines) {
              const payload = line.slice(6);
              if (payload === '[DONE]') {
                streamController.close();
                return;
              }
              streamController.enqueue(payload);
            }
          }
          streamController.close();
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            streamController.enqueue(JSON.stringify({ type: 'error', content: (err as Error).message }));
          }
          streamController.close();
        }
      },
    });

    return { stream, abort: () => controller.abort() };
  }

  /* ── Models / Providers ── */
  async getModels() {
    return this.fetch<{ models: import('@/types').AIModel[] }>('/api/v1/models');
  }

  async getProviders() {
    return this.fetch<{ providers: import('@/types').ProviderHealth[] }>('/api/v1/providers');
  }

  /* ── Admin ── */
  async getUsers() {
    return this.fetch<{ users: import('@/types').User[] }>('/api/v1/admin/users');
  }

  async updateUser(id: string, data: Partial<import('@/types').User>) {
    return this.fetch<{ user: import('@/types').User }>(`/api/v1/admin/users/${id}`, {
      method: 'PATCH', json: data,
    });
  }

  async getApiKeys() {
    return this.fetch<{ keys: import('@/types').ApiKey[] }>('/api/v1/admin/keys');
  }

  async addApiKey(data: { provider: string; key: string }) {
    return this.fetch<{ key: import('@/types').ApiKey }>('/api/v1/admin/keys', {
      method: 'POST', json: data,
    });
  }

  async deleteApiKey(id: string) {
    return this.fetch(`/api/v1/admin/keys/${id}`, { method: 'DELETE' });
  }

  async getUsageStats() {
    return this.fetch<import('@/types').UsageStats>('/api/v1/stats');
  }

  async getAuditLog() {
    return this.fetch<{ entries: import('@/types').AuditEntry[] }>('/api/v1/admin/audit');
  }

  /* ── Prompts ── */
  async getPrompts() {
    return this.fetch<{ prompts: import('@/types').PromptTemplate[] }>('/api/v1/prompts');
  }

  async createPrompt(data: Omit<import('@/types').PromptTemplate, 'id' | 'userId' | 'usageCount' | 'createdAt'>) {
    return this.fetch<{ prompt: import('@/types').PromptTemplate }>('/api/v1/prompts', {
      method: 'POST', json: data,
    });
  }

  async deletePrompt(id: string) {
    return this.fetch(`/api/v1/prompts/${id}`, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
