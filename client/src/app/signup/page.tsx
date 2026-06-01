'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Bot, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { signup, loading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await signup(email, password, name);
      router.push('/chat');
    } catch (err) {
      setError((err as Error).message || 'Signup failed');
    }
  };

  return (
    <div className="flex-1 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 to-brand-900 text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-10 h-10" />
            <h1 className="text-3xl font-bold">MCP AI Server</h1>
          </div>
          <p className="text-brand-200 text-lg">Create your MCP workspace account</p>
        </div>

        <div className="space-y-6">
          <Feature icon="[]" title="Agent Workspace" desc="Run tool-enabled conversations through your MCP server" />
          <Feature icon="{}" title="Operational Tools" desc="Register, inspect, and call business tools from one interface" />
          <Feature icon="##" title="Usage Dashboard" desc="Track workspace activity, provider health, and operations" />
          <Feature icon="++" title="Team Ready" desc="Invite your team, manage roles, and control access" />
        </div>

        <div className="flex items-center gap-2 text-brand-200 text-sm">
          <Shield className="w-4 h-4" />
          <span>Your data is encrypted and never shared</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Bot className="w-8 h-8 text-brand-500" />
              <h1 className="text-2xl font-bold">MCP AI Server</h1>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Create your account</h2>
            <p className="text-[var(--text-secondary)] mt-1">Set up access to your MCP AI workspace</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">Full Name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-brand-500 transition pr-10"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">Confirm Password</label>
              <input
                id="confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50"
            >
              {loading ? (
                <div className="typing-indicator"><span /><span /><span /></div>
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="text-center text-sm text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-500 hover:text-brand-600 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-brand-200 text-sm">{desc}</p>
      </div>
    </div>
  );
}
