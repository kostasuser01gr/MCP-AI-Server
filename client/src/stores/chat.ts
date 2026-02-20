import { create } from 'zustand';
import type { Conversation, Message, AIModel, StreamChunk } from '@/types';
import { api } from '@/lib/api';
import { generateId } from '@/lib/utils';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  models: AIModel[];
  selectedModel: string | null;
  isStreaming: boolean;
  streamAbort: (() => void) | null;
  searchQuery: string;

  loadConversations: () => Promise<void>;
  loadModels: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: () => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversation: (id: string, data: Partial<Conversation>) => Promise<void>;
  setSelectedModel: (modelId: string) => void;
  setSearchQuery: (q: string) => void;
  sendMessage: (content: string, systemPrompt?: string) => Promise<void>;
  stopStreaming: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  models: [],
  selectedModel: null,
  isStreaming: false,
  streamAbort: null,
  searchQuery: '',

  loadConversations: async () => {
    try {
      const { conversations } = await api.getConversations();
      set({ conversations });
    } catch {
      // ignore – might not be logged in
    }
  },

  loadModels: async () => {
    try {
      const { models } = await api.getModels();
      set({ models });
      if (!get().selectedModel && models.length > 0) {
        const defaultModel = models.find((m) => m.enabled && m.free) || models[0];
        set({ selectedModel: defaultModel.id });
      }
    } catch {
      // fallback models
    }
  },

  selectConversation: async (id) => {
    set({ activeConversationId: id });
    try {
      const { messages } = await api.getConversation(id);
      set({ messages });
    } catch {
      set({ messages: [] });
    }
  },

  createConversation: async () => {
    try {
      const { conversation } = await api.createConversation({
        modelId: get().selectedModel || undefined,
      });
      set((s) => ({
        conversations: [conversation, ...s.conversations],
        activeConversationId: conversation.id,
        messages: [],
      }));
      return conversation.id;
    } catch {
      // Offline fallback: create local conversation
      const id = generateId();
      const conversation: Conversation = {
        id,
        title: 'New Chat',
        userId: '',
        modelId: get().selectedModel || 'auto',
        starred: false,
        tags: [],
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((s) => ({
        conversations: [conversation, ...s.conversations],
        activeConversationId: id,
        messages: [],
      }));
      return id;
    }
  },

  deleteConversation: async (id) => {
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
      messages: s.activeConversationId === id ? [] : s.messages,
    }));
    try { await api.deleteConversation(id); } catch { /* ok */ }
  },

  updateConversation: async (id, data) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    }));
    try { await api.updateConversation(id, data); } catch { /* ok */ }
  },

  setSelectedModel: (modelId) => set({ selectedModel: modelId }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  sendMessage: async (content, systemPrompt) => {
    const state = get();
    let conversationId = state.activeConversationId;

    // Auto-create conversation if needed
    if (!conversationId) {
      conversationId = await get().createConversation();
    }

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      conversationId: conversationId!,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    // Add placeholder assistant message
    const assistantMessage: Message = {
      id: generateId(),
      conversationId: conversationId!,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMessage, assistantMessage],
      isStreaming: true,
    }));

    // Stream response
    const { stream, abort } = api.streamChat({
      conversationId: conversationId!,
      message: content,
      model: state.selectedModel || undefined,
      systemPrompt,
    });

    set({ streamAbort: abort });

    try {
      const reader = stream.getReader();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        try {
          const chunk: StreamChunk = JSON.parse(value);
          if (chunk.type === 'text') {
            fullContent += chunk.content;
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: fullContent, model: chunk.model, provider: chunk.provider }
                  : m
              ),
            }));
          } else if (chunk.type === 'done') {
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, tokens: chunk.tokens, latencyMs: chunk.latencyMs }
                  : m
              ),
            }));
          } else if (chunk.type === 'error') {
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: `Error: ${chunk.content}` }
                  : m
              ),
            }));
          }
        } catch {
          // Non-JSON chunk, append as text
          fullContent += value;
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: fullContent } : m
            ),
          }));
        }
      }

      // Update conversation title from first message
      const conv = get().conversations.find((c) => c.id === conversationId);
      if (conv && conv.title === 'New Chat' && content.length > 0) {
        const title = content.slice(0, 60) + (content.length > 60 ? '…' : '');
        get().updateConversation(conversationId!, { title });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: `Error: ${(err as Error).message}` }
              : m
          ),
        }));
      }
    } finally {
      set({ isStreaming: false, streamAbort: null });
    }
  },

  stopStreaming: () => {
    const { streamAbort } = get();
    if (streamAbort) streamAbort();
    set({ isStreaming: false, streamAbort: null });
  },
}));
