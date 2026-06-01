import Link from 'next/link';
import { Bot, Server, Shield, Terminal } from 'lucide-react';

const capabilities = [
  { icon: Server, title: 'MCP over HTTP', text: 'Stable /mcp and /health endpoints for tool-enabled agents.' },
  { icon: Bot, title: 'Agent workspace', text: 'Authenticated chat client with provider routing and operational dashboards.' },
  { icon: Shield, title: 'Local-first security', text: 'SQLite storage, API-key MCP access, and explicit production secrets.' },
  { icon: Terminal, title: 'Operator docs', text: 'Verification, launchd service scripts, and OpenAI registration notes.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex-1 bg-[var(--surface-0)] text-[var(--text-primary)]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-3">
            <Bot className="h-9 w-9 text-brand-500" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500">
              MCP AI Server
            </p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            A local-first Model Context Protocol server with a production-ready AI workspace.
          </h1>
          <p className="text-lg leading-8 text-[var(--text-secondary)]">
            This repository demonstrates how to expose typed business tools to AI agents while keeping
            operational data local, auditable, and protected. The public overview is intentionally open;
            the chat workspace and admin surfaces remain behind authentication.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <Icon className="mb-4 h-5 w-5 text-brand-500" />
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/chat" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
            Open protected workspace
          </Link>
          <a
            href="https://github.com/kostasuser01gr/MCP-AI-Server"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
          >
            View source
          </a>
        </div>
      </section>
    </main>
  );
}
