# MCP Car Rental

Local MCP server for a car rental fleet management system. Exposes tools via the Model Context Protocol (MCP) over HTTP, compatible with OpenAI Apps SDK and any MCP client.

**Free to run locally** — SQLite for storage, no paid APIs, no cloud dependencies.

> **OpenAI platform note:** Registering this server as an OpenAI App requires a **public HTTPS URL** and **domain verification**. The server itself costs nothing to run, but you need a way to expose it to the internet (see [Exposing Your Server](#exposing-your-server) below).

---

## Quick Start

```bash
cd server
cp ../.env.example ../.env   # Edit: set MCP_API_KEY to a random secret
npm install
npm run build
npm start
```

Open http://localhost:3030/health — you should see `{ "ok": true, ... }`.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/mcp` | `x-api-key` | MCP JSON-RPC (tools/list, tools/call) |
| GET | `/.well-known/mcp-verification.txt` | No | Domain verification for OpenAI |

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
| `MCP_API_KEY` | _(empty)_ | Required in `api_key` mode |
| `AUTH_MODE` | `api_key` | `api_key` or `no_auth` |
| `DB_PATH` | `./data/app.db` | SQLite database file |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

## Auth

By default, all requests to `/mcp` require an `x-api-key` header matching `MCP_API_KEY`.

For local development, set `AUTH_MODE=no_auth` in `.env` to skip auth.

## Exposing Your Server

The server runs on `http://localhost:3030` by default. To register it with OpenAI, you need a **public HTTPS URL**.

| Option | Cost | Notes |
|--------|------|-------|
| **LAN only** | Free | Works with local MCP clients. Cannot pass OpenAI domain verification. |
| **Cloudflare Tunnel** | Free | `cloudflared tunnel --url http://localhost:3030` gives you a public `https://*.trycloudflare.com` URL. No account needed for quick tunnels. |
| **Always-on device** | Free–low | Mac Mini, Raspberry Pi, Oracle Cloud Free Tier, etc. Best for 24/7 availability. |

> `ngrok` also works but the free tier has session time limits. Cloudflare quick tunnels have no such limit.

## OpenAI Platform Setup

Requires a **public HTTPS URL** (see above).

1. Set `MCP_API_KEY` in `.env` (or use `AUTH_MODE=no_auth` for initial testing).
2. Start a tunnel: `cloudflared tunnel --url http://localhost:3030`
3. In OpenAI platform → App → **MCP Server** step:
   - **MCP Server URL**: `https://YOUR_TUNNEL_HOSTNAME/mcp`
   - **Auth**: select **API Key** and enter your `MCP_API_KEY`, or select **No Auth** if `AUTH_MODE=no_auth`.
   - Click **Scan Tools** — OpenAI will call `tools/list` and discover the 6 tools.
4. **Domain verification**:
   - Copy the verification token shown by OpenAI.
   - Paste it as the **only content** of `public/.well-known/mcp-verification.txt` (no extra whitespace).
   - Restart the server (the file is served as static `text/plain`).
   - Verify it works: `curl https://YOUR_TUNNEL_HOSTNAME/.well-known/mcp-verification.txt` — must return the token exactly.
   - Click **Verify Domain** in the OpenAI form.
5. Continue through the remaining steps (Testing → Screenshots → Submit).

## Database

SQLite with WAL mode. Tables: `vehicles`, `washes`, `sales`, `audit_log`.

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
launchctl print gui/$(id -u)/com.kostas.mcp-car-rental
tail -f ~/Library/Logs/mcp-car-rental/out.log
tail -f ~/Library/Logs/mcp-car-rental/err.log
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
| DB locked errors | Only one server process should access DB. Stop duplicates. |
| launchd won't start | Check `~/Library/Logs/mcp-car-rental/err.log` |
| Server stops when lid closes | See "Lid Closed" section above |
| Tools not found by OpenAI | Ensure verification file has correct token, URL is reachable |

## Project Structure

```
mcp-car-rental/
├── .env.example              # Environment template
├── .gitignore
├── SECURITY.md               # Security & code scanning policy
├── .github/workflows/
│   └── codeql.yml            # CodeQL Code Scanning workflow
├── knowledge/                # Markdown files for knowledge_search tool
│   └── policies.md
├── org/                      # Org-wide templates
│   ├── _org_checklist.md     # Onboarding checklist for new repos
│   └── reusable-codeql.yml   # Reusable CodeQL workflow (workflow_call)
├── public/
│   └── .well-known/
│       └── mcp-verification.txt
├── ops/macos/                # launchd service files
│   ├── com.kostas.mcp-car-rental.plist
│   ├── install.sh
│   └── uninstall.sh
└── server/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts           # Express entry point
        ├── config.ts          # Env validation (Zod)
        ├── logger.ts          # Structured JSON logger
        ├── smoke.ts           # Smoke test script
        ├── auth/
        │   └── middleware.ts   # x-api-key guard
        ├── db/
        │   ├── connection.ts  # SQLite singleton
        │   ├── schema.ts      # Table definitions
        │   └── seed.ts        # Demo data
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
launchctl print gui/$(id -u)/com.kostas.mcp-car-rental
tail -5 ~/Library/Logs/mcp-car-rental/out.log
```

---

## License

MIT
