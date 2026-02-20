'use client';

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { useChatStore } from '@/stores/chat';
import { cn, formatTokens } from '@/lib/utils';
import {
  Send, Square, Bot, User, Copy, Check, ChevronDown,
  Sparkles, Zap, RotateCcw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatPage() {
  const {
    messages, models, selectedModel, isStreaming,
    activeConversationId, sendMessage, stopStreaming,
    setSelectedModel, loadModels,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRetry = () => {
    if (messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) sendMessage(lastUserMsg.content);
  };

  const currentModel = models.find((m) => m.id === selectedModel);

  // Empty state
  if (!activeConversationId && messages.length === 0) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full text-center space-y-8">
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold">What can I help you with?</h1>
              <p className="text-[var(--text-secondary)]">
                Free AI assistant powered by {models.length || 'multiple'} models — instant answers, zero cost
              </p>
            </div>

            {/* Quick prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt.title}
                  onClick={() => { setInput(prompt.text); textareaRef.current?.focus(); }}
                  className="text-left p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-1)] hover:border-brand-300 dark:hover:border-brand-700 transition group"
                >
                  <span className="text-lg">{prompt.icon}</span>
                  <p className="text-sm font-medium mt-1 group-hover:text-brand-500 transition">{prompt.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{prompt.desc}</p>
                </button>
              ))}
            </div>

            {/* Model info */}
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
              <Zap className="w-3 h-3" />
              <span>Using {currentModel?.name || 'auto-selected model'} — responses in &lt;200ms</span>
            </div>
          </div>
        </div>

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          isStreaming={isStreaming}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
          models={models}
          selectedModel={selectedModel}
          currentModel={currentModel}
          showModelPicker={showModelPicker}
          setShowModelPicker={setShowModelPicker}
          setSelectedModel={setSelectedModel}
          onStop={stopStreaming}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3 animate-fade-in',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={cn(
                  'rounded-2xl px-4 py-3 max-w-[85%] min-w-0',
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-md'
                    : 'bg-[var(--surface-1)] border border-[var(--border)] rounded-bl-md'
                )}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose dark:prose-invert prose-sm max-w-none stream-text">
                    {msg.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="typing-indicator py-1">
                        <span /><span /><span />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* Message meta */}
                {msg.role === 'assistant' && msg.content && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border)]">
                    {msg.model && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {msg.model}
                      </span>
                    )}
                    {msg.latencyMs && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {msg.latencyMs}ms
                      </span>
                    )}
                    {msg.tokens && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatTokens(msg.tokens.completion)} tokens
                      </span>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1 rounded hover:bg-[var(--surface-2)] transition"
                      title="Copy"
                    >
                      {copiedId === msg.id
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                    </button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {!isStreaming && messages.length > 1 && messages[messages.length - 1]?.role === 'assistant' && (
            <div className="flex justify-center">
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              >
                <RotateCcw className="w-3 h-3" />
                Regenerate
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput
        input={input}
        setInput={setInput}
        isStreaming={isStreaming}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        textareaRef={textareaRef}
        models={models}
        selectedModel={selectedModel}
        currentModel={currentModel}
        showModelPicker={showModelPicker}
        setShowModelPicker={setShowModelPicker}
        setSelectedModel={setSelectedModel}
        onStop={stopStreaming}
      />
    </div>
  );
}

/* ── Chat Input Component ── */
interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  isStreaming: boolean;
  onSubmit: (e?: FormEvent) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  models: import('@/types').AIModel[];
  selectedModel: string | null;
  currentModel: import('@/types').AIModel | undefined;
  showModelPicker: boolean;
  setShowModelPicker: (v: boolean) => void;
  setSelectedModel: (id: string) => void;
  onStop: () => void;
}

function ChatInput({
  input, setInput, isStreaming, onSubmit, onKeyDown, textareaRef,
  models, selectedModel, currentModel, showModelPicker, setShowModelPicker,
  setSelectedModel, onStop,
}: ChatInputProps) {
  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface-0)]">
      <div className="max-w-3xl mx-auto p-4">
        {/* Model picker */}
        <div className="relative mb-2">
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition px-2 py-1 rounded-lg hover:bg-[var(--surface-1)]"
          >
            <Sparkles className="w-3 h-3" />
            <span>{currentModel?.name || 'Auto'}</span>
            <ChevronDown className={cn('w-3 h-3 transition-transform', showModelPicker && 'rotate-180')} />
          </button>

          {showModelPicker && (
            <div className="absolute bottom-full left-0 mb-1 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl shadow-xl z-50 w-80 max-h-64 overflow-y-auto">
              <div className="p-2 space-y-0.5">
                {models.filter((m) => m.enabled).map((model) => (
                  <button
                    key={model.id}
                    onClick={() => { setSelectedModel(model.id); setShowModelPicker(false); }}
                    className={cn(
                      'flex items-center gap-3 w-full p-2 rounded-lg text-left transition',
                      selectedModel === model.id
                        ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400'
                        : 'hover:bg-[var(--surface-1)]'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{model.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {model.provider} · {model.speed} · {model.contextWindow / 1000}K context
                      </p>
                    </div>
                    {model.free && (
                      <span className="text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                        FREE
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <form onSubmit={onSubmit} className="relative">
          <textarea
            ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Send a message…"
            rows={1}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-[var(--text-muted)] transition"
            disabled={isStreaming}
          />
          <div className="absolute right-2 bottom-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition"
                title="Stop generating"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">
          Free & open source — responses generated by AI models. Always verify important information.
        </p>
      </div>
    </div>
  );
}

/* ── Quick Prompts ── */
const QUICK_PROMPTS = [
  { icon: '💡', title: 'Explain a concept', desc: 'Break down any topic simply', text: 'Explain ' },
  { icon: '💻', title: 'Write code', desc: 'Generate code in any language', text: 'Write a function that ' },
  { icon: '📝', title: 'Summarize text', desc: 'Get the key points quickly', text: 'Summarize the following:\n\n' },
  { icon: '🔍', title: 'Analyze data', desc: 'Help me understand my data', text: 'Analyze this data:\n\n' },
];
