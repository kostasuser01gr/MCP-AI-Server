'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { Settings, User, Palette, Bot, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore();
  const { models, selectedModel, setSelectedModel, loadModels } = useChatStore();
  const [name, setName] = useState(user?.name || '');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadModels();
    const current = localStorage.getItem('theme') || 'system';
    setTheme(current as 'light' | 'dark' | 'system');
  }, [loadModels]);

  const handleSave = async () => {
    try {
      await updateProfile({ name, preferredModel: selectedModel || undefined, theme });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* err */ }
  };

  const handleThemeChange = (t: 'light' | 'dark' | 'system') => {
    setTheme(t);
    localStorage.setItem('theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (t === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Customize your profile and preferences
        </p>
      </div>

      {/* Profile */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <User className="w-4 h-4" />
          <h2 className="font-semibold">Profile</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Palette className="w-4 h-4" />
          <h2 className="font-semibold">Appearance</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={cn(
                'p-3 rounded-xl border text-center transition capitalize text-sm font-medium',
                theme === t
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-600'
                  : 'border-[var(--border)] hover:bg-[var(--surface-1)]'
              )}
            >
              {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'} {t}
            </button>
          ))}
        </div>
      </section>

      {/* Default Model */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Bot className="w-4 h-4" />
          <h2 className="font-semibold">Default Model</h2>
        </div>

        <select
          value={selectedModel || ''}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        >
          <option value="">Auto (fastest available)</option>
          {models.filter((m) => m.enabled).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.provider}) — {m.speed}
            </option>
          ))}
        </select>
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition"
      >
        {saved ? (
          <><Check className="w-4 h-4" /> Saved!</>
        ) : (
          <><Save className="w-4 h-4" /> Save Changes</>
        )}
      </button>
    </div>
  );
}
