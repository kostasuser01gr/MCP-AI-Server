'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatTokens, formatCost } from '@/lib/utils';
import type { UsageStats, ProviderHealth } from '@/types';
import {
  MessageSquare, Coins, Zap, TrendingUp,
  Activity, CircleDot, BarChart3, DollarSign,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getUsageStats().catch(() => null),
      api.getProviders().catch(() => ({ providers: [] })),
    ]).then(([s, p]) => {
      setStats(s);
      setProviders(p?.providers || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="typing-indicator"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Usage analytics and system health
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={MessageSquare}
          label="Total Messages"
          value={stats?.totalMessages?.toLocaleString() || '0'}
          trend="+12% this week"
          color="blue"
        />
        <KPICard
          icon={Coins}
          label="Total Tokens"
          value={formatTokens(stats?.totalTokens || 0)}
          trend="Across all models"
          color="purple"
        />
        <KPICard
          icon={DollarSign}
          label="Money Saved"
          value={formatCost(stats?.totalTokens || 0)}
          trend="vs. paid APIs"
          color="green"
        />
        <KPICard
          icon={Zap}
          label="Avg Response"
          value={`${stats?.avgResponseTime || 0}ms`}
          trend="First token latency"
          color="yellow"
        />
      </div>

      {/* Provider Status */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-semibold">Provider Health</h2>
        </div>

        {providers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No providers configured yet</p>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--surface-0)]">
                <CircleDot className={`w-4 h-4 ${
                  p.status === 'online' ? 'text-green-500' :
                  p.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{p.latencyMs}ms latency</p>
                </div>
                <div className="text-right">
                  <div className="w-32 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.rateLimitUsed / p.rateLimitMax < 0.7 ? 'bg-green-500' :
                        p.rateLimitUsed / p.rateLimitMax < 0.9 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(p.rateLimitUsed / p.rateLimitMax) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {p.rateLimitUsed}/{p.rateLimitMax} requests
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage by model */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold">Tokens by Model</h2>
          </div>
          {stats?.tokensByModel?.length ? (
            <div className="space-y-3">
              {stats.tokensByModel.map((m) => {
                const max = Math.max(...stats.tokensByModel.map((x) => x.tokens));
                return (
                  <div key={m.model}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{m.model}</span>
                      <span className="text-[var(--text-muted)]">{formatTokens(m.tokens)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${(m.tokens / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No usage data yet</p>
          )}
        </div>

        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold">Messages per Day</h2>
          </div>
          {stats?.messagesPerDay?.length ? (
            <div className="flex items-end gap-1 h-40">
              {stats.messagesPerDay.slice(-14).map((d) => {
                const max = Math.max(...stats.messagesPerDay.map((x) => x.count));
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-brand-500 rounded-t-sm transition-all hover:bg-brand-600"
                      style={{ height: `${max > 0 ? (d.count / max) * 100 : 0}%`, minHeight: '2px' }}
                      title={`${d.date}: ${d.count} messages`}
                    />
                    <span className="text-[8px] text-[var(--text-muted)] rotate-[-45deg] origin-center">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No usage data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon, label, value, trend, color,
}: {
  icon: React.ElementType; label: string; value: string; trend: string; color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400',
  };

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{trend}</p>
        </div>
      </div>
    </div>
  );
}
