# MCP AI Server

[![CI](https://github.com/kostasuser01gr/MCP-AI-Server/actions/workflows/ci.yml/badge.svg)](https://github.com/kostasuser01gr/MCP-AI-Server/actions/workflows/ci.yml)
[![Local First](https://img.shields.io/badge/Mode-Local_First-green)](#quick-start)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/Protocol-MCP-purple)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)

Local MCP server and AI workspace for fleet operations. Exposes tools via the Model Context Protocol (MCP) over HTTP, compatible with OpenAI Apps SDK and any MCP client. The integrated MCP AI Server client provides authenticated chat, provider routing, dashboards, and admin controls.

**Free to run locally** — SQLite for storage, free cloud AI models, no paid APIs, no cloud dependencies.

> **Live deployment status:** There is currently no verified public demo URL for this repository. If a GitHub homepage or README link points to an unrelated app, do not use it for OpenAI MCP registration.

> **Zero-charge mode:** This repository is local-first. Do not run deployment, linking, hosted secret, or platform project commands unless you explicitly approve hosted platform changes and any possible billing exposure.

> **OpenAI platform note:** Registering this server as an OpenAI App requires a **public HTTPS URL** and **domain verification**. The server itself costs nothing to run, but you need a way to expose it to the internet (see [Exposing Your Server](#exposing-your-server) below).

---

## Features

- **MCP Server** — 6 fleet management tools via JSON-RPC
- **MCP AI Server Client** — ChatGPT-like interface with 10+ free AI models
- **Smart Router** — auto-selects fastest available provider, auto-fallback on rate limits
- **SSE Streaming** — instant token-by-token responses
- **PWA** — installable on any device/OS from the browser
- **Admin Panel** — manage models, API keys, and users
- **Dashboard** — usage stats, provider health, token metrics

---

## Quick Start

```bash
# 1. Server
cd server
cp ../.env.example ../.env   # Edit: set MCP_API_KEY, JWT_SECRET, add AI provider keys
npm install
npm run build
npm start

# 2. Client (in a new terminal)
cd client
npm install
npm run dev
```

- Server: http://localhost:3030/health
- Client: http://localhost:3001
- First signup → becomes **owner** (full admin access)

## AI Providers (all free tiers)

| Provider | Models | Speed | Get Key |
|----------|--------|-------|---------|
| **Cerebras** | Llama 3.3 70B | ~2000 tok/s | [cloud.cerebras.ai](https://cloud.cerebras.ai/) |
| **Groq** | Llama 3.3 70B, 3.1 8B, Mixtral | Instant | [console.groq.com/keys](https://console.groq.com/keys) |
| **Google Gemini** | Gemini 2.0 Flash, Thinking | Fast | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Together.ai** | Llama 3.1 70B | Fast | [api.together.xyz](https://api.together.xyz/settings/api-keys) |
| **Mistral** | Mistral Small | Fast | [console.mistral.ai](https://console.mistral.ai/api-keys/) |
| **OpenRouter** | Llama 3.1 8B (free) | Fast | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **SambaNova** | Llama 3.1 405B | Medium | [cloud.sambanova.ai](https://cloud.sambanova.ai/) |

Add keys in `.env` or at runtime via **Admin → API Keys**. You don't need all — the router auto-selects from available providers.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/mcp` | `x-api-key` | MCP JSON-RPC (tools/list, tools/call) |
| GET | `/.well-known/mcp-verification.txt` | No | Domain verification for OpenAI |
| POST | `/api/v1/auth/signup` | No | Create account |
| POST | `/api/v1/auth/login` | No | Login → JWT |
| GET | `/api/v1/auth/me` | JWT | Current user |
| POST | `/api/v1/chat/stream` | JWT | SSE streaming chat |
| GET | `/api/v1/chat/conversations` | JWT | List conversations |
| GET | `/api/v1/models` | JWT | Available AI models |
| GET | `/api/v1/providers/health` | JWT | Provider status |
| GET | `/api/v1/stats` | JWT | Usage statistics |
| * | `/api/v1/admin/*` | JWT + Admin | Users, API keys, audit log |

## MCP Tools

| Tool | Description |
|------|-------------|
| `fleet_list_vehicles` | List vehicles with optional status/location filters |
| `fleet_update_status` | Change a vehicle's status |
| `wash_log_create` | Log a vehicle wash |
| `sales_log_create` | Record a sale transaction |
| `report_daily_summary` | Daily KPIs: fleet counts, washes, sales/revenue |
| `knowledge_search` | Search ./knowledge/ markdown files |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3030` | HTTP port |
| `MCP_API_KEY` | _(empty)_ | Required in production when `AUTH_MODE=api_key` |
| `AUTH_MODE` | `api_key` | `api_key` or `no_auth` |
| `JWT_SECRET` | `dev-secret...` | JWT signing secret (must be changed in production) |
| `MCP_VERIFICATION_TOKEN` | _(empty)_ | OpenAI domain verification token fallback |
| `DB_PATH` | `./data/app.db` | SQLite database file |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `CLIENT_ORIGIN` | `http://localhost:3001` | CORS origin for client |
| `GROQ_API_KEY` | _(empty)_ | Groq provider key |
| `GEMINI_API_KEY` | _(empty)_ | Google Gemini key |
| `CEREBRAS_API_KEY` | _(empty)_ | Cerebras key |
| `SAMBANOVA_API_KEY` | _(empty)_ | SambaNova key |
| `TOGETHER_API_KEY` | _(empty)_ | Together.ai key |
| `OPENROUTER_API_KEY` | _(empty)_ | OpenRouter key |
| `MISTRAL_API_KEY` | _(empty)_ | Mistral key |

## Auth

By default, all requests to `/mcp` require an `x-api-key` header matching `MCP_API_KEY`.

For local development, set `AUTH_MODE=no_auth` in `.env` to skip auth.

## Exposing Your Server (Public HTTPS)

The server runs on `http://localhost:3030` by default. OpenAI MCP registration requires a **public HTTPS URL**.

The options below can involve hosted platform state or third-party account limits. In zero-charge mode, keep the server local and do not run these commands without explicit approval.

| Option | Cost | URL Stability | Best for |
|------|------|---------------|----------|
| **Vercel** | Free tier available | Stable | Managed hosting, no local tunnel process |
| **Cloudflare Tunnel (quick)** | Free | Changes on restart | Fast local testing |
| **Cloudflare Tunnel (named)** | Free | Stable | Self-hosting with your own domain |

### Option A — Vercel (optional hosted endpoint)

See [deploy/vercel.md](deploy/vercel.md).  
Your OpenAI MCP URL will be: `https://YOUR_APP.vercel.app/mcp`.

Important:
- Use a canonical public production alias you control.
- Do not use deployment-specific or git aliases for OpenAI unless you intentionally disabled Vercel Authentication on those aliases.
- Do not create or deploy a Vercel project in zero-charge mode.

### Option B — Cloudflare Tunnel (run locally + expose)

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3030
```

Copy the `https://*.trycloudflare.com` URL printed in the terminal.

For stable tunnel domains, see [ops/cloudflare/setup.md](ops/cloudflare/setup.md) and [ops/cloudflare/config.example.yml](ops/cloudflare/config.example.yml).

## OpenAI Platform Setup

Requires a **public HTTPS URL** (see [Exposing Your Server](#exposing-your-server-public-https) above).

1. Set `MCP_API_KEY` in `.env` (or use `AUTH_MODE=no_auth` for initial testing).
2. Pick one deployment path:
   - **Vercel**: deploy from repo root per [deploy/vercel.md](deploy/vercel.md)
   - **Cloudflare Tunnel**: start server (`cd server && npm start`) and then run `cloudflared tunnel --url http://localhost:3030`
3. In OpenAI platform → App → **MCP Server** step:
   - **MCP Server URL**: `https://YOUR_PUBLIC_HOSTNAME/mcp`
   - **Auth**: select **Custom header** → Header: `x-api-key`, Value: your `MCP_API_KEY`. Or select **No Auth** if `AUTH_MODE=no_auth`.
   - Click **Scan Tools** — expects 6 tools.
4. **Domain verification**:
   ```bash
   cd server && npm run set:verify-token -- "TOKEN_FROM_OPENAI"
   ```
   Confirm: `curl https://YOUR_PUBLIC_HOSTNAME/.well-known/mcp-verification.txt` — must return the exact token as plain text.
   Click **Verify Domain** in the form.
5. Continue through the remaining steps (Testing → Screenshots → Submit).

> Full form field reference with troubleshooting: [ops/openai-form-pack.md](ops/openai-form-pack.md)

## Database

SQLite with WAL mode. Tables: `vehicles`, `washes`, `sales`, `audit_log`, `users`, `conversations`, `messages`, `api_keys`, `prompt_templates`, `usage_log`.

Seed demo data:
```bash
npm run seed
```

DB file auto-created in `./data/` on first start.

---

## Run as macOS Service (launchd)

Auto-starts at login, auto-restarts on crash.

### Install

```bash
./ops/macos/install.sh
```

This will:
- Build the project
- Install a LaunchAgent plist to `~/Library/LaunchAgents/`
- Start the service immediately

### Status & Logs

```bash
launchctl print gui/$(id -u)/com.kostas.mcp-ai-server
tail -f ~/Library/Logs/mcp-ai-server/out.log
tail -f ~/Library/Logs/mcp-ai-server/err.log
```

### Uninstall

```bash
./ops/macos/uninstall.sh
```

---

## Lid Closed / Sleep

> When a MacBook lid is closed, macOS sleeps and the network goes down. The server becomes **unreachable** — there is no workaround that works on battery.

On AC power you can prevent sleep:

```bash
caffeinate -dimsu &          # Temporary — kill the process to re-enable sleep
sudo pmset -c sleep 0        # Persistent — revert with: sudo pmset -c sleep 10
```

For true 24/7 availability, run on a device without a lid (Mac Mini, Raspberry Pi, cloud VM).

---

## Testing

Server unit tests use **vitest**:

```bash
cd server
npm test          # single run
npm run test:watch # watch mode
```

Client lint:

```bash
cd client
npm run lint
```

## Smoke Test

Start the server, then:

```bash
# In another terminal:
npm run smoke
```

This verifies: health endpoint, MCP tools/list, tools/call, auth, and verification file.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `npm run build` fails | Run `npm install` first. Check Node.js ≥ 20. |
| Port 3030 in use | Set `PORT=3031` in `.env`, or kill the old process |
| 401 on /mcp | Set `x-api-key` header, or use `AUTH_MODE=no_auth` |
| 401 Authentication Required on `*.vercel.app` | Use a canonical alias you control, or disable Vercel Authentication for production deployment URLs/aliases in Project Settings |
| 404 NOT_FOUND on Vercel | Confirm root `vercel.json` + `api/index.ts` exist and project Root Directory is `.` |
| `FUNCTION_INVOCATION_FAILED` on Vercel | Check runtime logs and verify required env vars (`MCP_API_KEY`, `JWT_SECRET`, `AUTH_MODE`, `DB_PATH`) are set correctly |
| DB locked errors | Only one server process should access DB. Stop duplicates. |
| launchd won't start | Check `~/Library/Logs/mcp-ai-server/err.log` |
| Server stops when lid closes | See "Lid Closed" section above |
| Tools not found by OpenAI | Ensure verification file has correct token, URL is reachable |

## Project Structure

```
mcp-ai-server/
├── .editorconfig             # Editor formatting rules
├── .env.example              # Environment template
├── .gitignore
├── SECURITY.md               # Security & code scanning policy
├── .github/workflows/
│   ├── ci.yml                # CI: install → lint → test → build
│   └── codeql.yml            # CodeQL Code Scanning workflow
├── knowledge/                # Markdown files for knowledge_search tool
│   └── policies.md
├── org/                      # Org-wide templates
│   ├── _org_checklist.md     # Onboarding checklist for new repos
│   └── reusable-codeql.yml   # Reusable CodeQL workflow (workflow_call)
├── client/                   # Next.js 14 web app (AI Chat Hub)
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── public/
│   │   ├── manifest.json     # PWA manifest
│   │   └── sw.js             # Service worker
│   └── src/
│       ├── app/              # App Router pages
│       │   ├── layout.tsx    # Root layout + meta
│       │   ├── login/        # Auth pages
│       │   ├── signup/
│       │   └── (app)/        # Protected pages
│       │       ├── chat/     # AI chat interface
│       │       ├── dashboard/# Usage stats
│       │       ├── admin/    # Model/user/key mgmt
│       │       ├── settings/ # User preferences
│       │       └── install/  # PWA install guide
│       ├── components/       # React components
│       ├── stores/           # Zustand state
│       ├── hooks/            # Custom hooks (PWA, etc.)
│       ├── lib/              # API client, utils
│       └── types/            # Shared TypeScript types
├── public/
│   └── .well-known/
│       └── mcp-verification.txt
├── ops/                      # Deployment & operations
│   ├── cloudflare/           # Tunnel setup
│   ├── macos/                # launchd service
│   └── openai-form-pack.md   # OpenAI registration guide
└── server/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts           # Express entry point
        ├── config.ts          # Env validation (Zod)
        ├── logger.ts          # Structured JSON logger
        ├── smoke.ts           # Smoke test script
        ├── api/
        │   └── routes.ts      # REST API (auth, models, admin, stats)
        ├── auth/
        │   ├── middleware.ts   # x-api-key + JWT guards
        │   └── jwt.ts         # JWT sign/verify + user CRUD
        ├── chat/
        │   ├── routes.ts      # Chat endpoints + SSE streaming
        │   └── service.ts     # Conversation/message CRUD
        ├── db/
        │   ├── connection.ts  # SQLite singleton
        │   ├── schema.ts      # All table definitions
        │   └── seed.ts        # Demo data
        ├── llm/
        │   ├── router.ts      # Smart AI router (auto-fallback)
        │   ├── types.ts       # LLM type definitions
        │   └── providers/
        │       ├── catalog.ts          # Provider & model registry
        │       ├── openai-compatible.ts # Groq/Cerebras/Together/etc.
        │       └── gemini.ts           # Google Gemini adapter
        ├── mcp/
        │   ├── server.ts      # MCP Server factory
        │   └── routes.ts      # POST /mcp Express router
        └── tools/
            ├── registry.ts    # Tool registration + Zod→JSON Schema
            ├── fleet.ts       # fleet_list_vehicles, fleet_update_status
            ├── wash.ts        # wash_log_create
            ├── sales.ts       # sales_log_create
            ├── reports.ts     # report_daily_summary
            └── knowledge.ts   # knowledge_search
```

## Acceptance Checklist

Run these after starting the server to confirm everything works:

```bash
# 1. Health check
curl -s http://localhost:3030/health | grep '"ok":true'

# 2. MCP tools/list (6 tools expected)
curl -s http://localhost:3030/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'x-api-key: YOUR_KEY' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | grep -o '"name":"[^"]*"' | wc -l

# 3. Auth enforcement (expect 401)
curl -s -o /dev/null -w '%{http_code}' http://localhost:3030/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# 4. Verification file (expect plain text token)
curl -i http://localhost:3030/.well-known/mcp-verification.txt

# 5. Smoke test (all-in-one)
cd server && MCP_API_KEY=YOUR_KEY npm run smoke

# 6. launchd status (if installed)
launchctl print gui/$(id -u)/com.kostas.mcp-ai-server
tail -5 ~/Library/Logs/mcp-ai-server/out.log
```

---

## Quality Gates & Autofix

### TL;DR

Every PR goes through: **CI** (install → lint → test → build for server & client) + **CodeQL scan** → **Copilot Autofix** suggestions → required status checks must pass before merge. Weekly scans catch drift. Sentry Copilot + Docker Copilot are optional but recommended.

- CI workflow: [.github/workflows/ci.yml](.github/workflows/ci.yml)

### Code Scanning (CodeQL)

- Runs on every PR and weekly (Monday 03:00 UTC)
- Workflow: [.github/workflows/codeql.yml](.github/workflows/codeql.yml)
- Alerts appear as PR annotations and in **Security → Code scanning alerts**
- **Copilot Autofix** may suggest patches directly on alerts — always review before accepting

### Sentry Copilot Extension

1. Install **Sentry for GitHub Copilot** from VS Code Marketplace
2. Connect to your Sentry project via extension settings
3. In Copilot Chat, use:
   - `@sentry What are the most recent unresolved errors?`
   - `@sentry Suggest a fix for issue PROJ-1234`
   - `@sentry Generate unit tests for the fix in commit abc123`

### Docker Copilot

1. Install **Docker for GitHub Copilot** from VS Code Marketplace
2. Use prompts like:
   - `@docker Optimize this Dockerfile for smaller image size`
   - `@docker Add a healthcheck to my Compose service`
   - `@docker Scan this image for vulnerabilities`

### Branch Protection (Required Status Checks)

1. Go to **Settings → Branches → Branch protection rule** for `main`
2. Enable **Require status checks to pass before merging**
3. Add required checks: `code-scanning`, `Server (install → build → test)`, `Client (install → lint → build)`
4. Enable **Enforce for admins**

**GH CLI shortcut:**

```bash
gh api \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/<OWNER>/<REPO>/branches/main/protection \
  -f required_status_checks[strict]=true \
  -f 'required_status_checks[contexts][]=code-scanning' \
  -f 'required_status_checks[contexts][]=Server (install → build → test)' \
  -f 'required_status_checks[contexts][]=Client (install → lint → build)' \
  -f enforce_admins=true \
  -f restrictions=
```

### Org-wide Templates

- [org/reusable-codeql.yml](org/reusable-codeql.yml) — reusable CodeQL workflow (`workflow_call`)
- [org/_org_checklist.md](org/_org_checklist.md) — onboarding checklist for new repos

Place the reusable workflow in your org repo `<OWNER>/.github/.github/workflows/reusable-codeql.yml` and call it from each repo's CI.

---

## PWA Installation

The web client is a **Progressive Web App**. To install on any device:

1. Open the app in a browser
2. Navigate to **Install** in the sidebar
3. Click **Install App** (or follow browser-specific instructions shown on the page)

Works on: Chrome, Edge, Safari (iOS 16+), Android. Installed app works offline (cached assets) and launches like a native app.

---

## License

MIT
