'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { User, ApiKey, AuditEntry, AIModel } from '@/types';
import {
  Users, Key, ScrollText, Bot, Shield, Plus,
  Trash2, ToggleLeft, ToggleRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'models' | 'users' | 'keys' | 'audit';

export default function AdminPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('models');

  if (user?.role !== 'admin' && user?.role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-[var(--text-secondary)]">Admin privileges required</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'models', label: 'Models', icon: Bot },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'keys', label: 'API Keys', icon: Key },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Manage models, users, API keys, and view audit logs
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px',
              tab === t.id
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'models' && <ModelsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'keys' && <KeysTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

/* ── Models Tab ── */
function ModelsTab() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getModels().then(({ models }) => { setModels(models); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Enable or disable models available to all users. All models are free cloud-based.
      </p>
      <div className="grid gap-3">
        {models.map((model) => (
          <div
            key={model.id}
            className="flex items-center gap-4 p-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl"
          >
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              model.enabled
                ? 'bg-green-100 dark:bg-green-900/20 text-green-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            )}>
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium">{model.name}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
                  {model.provider}
                </span>
                {model.free && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600">
                    FREE
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {model.description} · {model.contextWindow / 1000}K context · {model.speed}
              </p>
              <div className="flex gap-1 mt-1">
                {model.capabilities.map((cap) => (
                  <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-secondary)]">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
            <button
              className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition"
              title={model.enabled ? 'Disable' : 'Enable'}
            >
              {model.enabled
                ? <ToggleRight className="w-6 h-6 text-green-500" />
                : <ToggleLeft className="w-6 h-6 text-gray-400" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Users Tab ── */
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUsers().then(({ users }) => { setUsers(users); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Name</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Email</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Role</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-1)]">
                <td className="py-3 px-4 font-medium">{u.name}</td>
                <td className="py-3 px-4 text-[var(--text-secondary)]">{u.email}</td>
                <td className="py-3 px-4">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    u.role === 'owner' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600' :
                    u.role === 'admin' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  )}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-[var(--text-muted)]">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Keys Tab ── */
function KeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newProvider, setNewProvider] = useState('groq');
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    api.getApiKeys().then(({ keys }) => { setKeys(keys); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newKey.trim()) return;
    try {
      const { key } = await api.addApiKey({ provider: newProvider, key: newKey });
      setKeys((prev) => [...prev, key]);
      setNewKey('');
      setShowAdd(false);
    } catch { /* err */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch { /* err */ }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Add free API keys for cloud providers. These are used for all users.
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Key
        </button>
      </div>

      {showAdd && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-sm"
            >
              <option value="groq">Groq</option>
              <option value="gemini">Google Gemini</option>
              <option value="cerebras">Cerebras</option>
              <option value="sambanova">SambaNova</option>
              <option value="together">Together.ai</option>
              <option value="openrouter">OpenRouter</option>
              <option value="mistral">Mistral</option>
              <option value="cohere">Cohere</option>
            </select>
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Paste API key"
              className="col-span-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 p-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg">
            <Key className="w-4 h-4 text-[var(--text-muted)]" />
            <div className="flex-1">
              <p className="text-sm font-medium capitalize">{k.provider}</p>
              <p className="text-xs text-[var(--text-muted)]">{k.keyPreview}</p>
            </div>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              k.isActive ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-red-100 dark:bg-red-900/20 text-red-600'
            )}>
              {k.isActive ? 'Active' : 'Inactive'}
            </span>
            <button onClick={() => handleDelete(k.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {keys.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            No API keys added yet. Add free keys to enable cloud AI providers.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Audit Tab ── */
function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditLog().then(({ entries }) => { setEntries(entries); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start gap-3 p-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg">
          <ScrollText className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{e.userName}</span>{' '}
              <span className="text-[var(--text-secondary)]">{e.action}</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{e.details}</p>
          </div>
          <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
            {new Date(e.createdAt).toLocaleString()}
          </span>
        </div>
      ))}
      {entries.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] text-center py-8">No audit entries yet</p>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-12">
      <div className="typing-indicator"><span /><span /><span /></div>
    </div>
  );
}
