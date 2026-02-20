# OpenAI Platform — MCP Server Form Fill Pack

> Step-by-step values for the OpenAI "MCP Server" registration form.
> Assumes the server is already reachable over public HTTPS via **Vercel** or **Cloudflare Tunnel**.

---

## Current Deployment (last verified 2026-02-20)

| Field | Value |
|---|---|
| **Public URL** | `https://mel-resolve-heavy-perry.trycloudflare.com` |
| **MCP endpoint** | `https://mel-resolve-heavy-perry.trycloudflare.com/mcp` |
| **Auth mode** | `api_key` (header `x-api-key`) |
| **API key** | `test-key-12345` |
| **Verification token** | `50VwplddJwV-1SkQetDu0KZeC9AR1eLj_obv0JyRSSg` |
| **Tools discovered** | 6 (`fleet_list_vehicles`, `fleet_update_status`, `wash_log_create`, `sales_log_create`, `report_daily_summary`, `knowledge_search`) |
| **Tunnel type** | Quick tunnel (URL changes on restart) |

> **Note:** Quick tunnel URLs change every time `cloudflared` restarts. Update the MCP Server URL in the OpenAI form after each tunnel restart, or migrate to a named tunnel for a stable domain.

---

## Prerequisites

| Requirement | How |
|---|---|
| Public HTTPS URL | Vercel deploy (`../deploy/vercel.md`) or Cloudflare tunnel (`cloudflare/setup.md`) |
| `cloudflared` installed (Cloudflare mode only) | `brew install cloudflared` (macOS) or `winget install Cloudflare.cloudflared` (Windows) |
| Local server (Cloudflare mode only) | `cd server && npm start` |
| Verification token | Provided by the OpenAI form (step 4 below) |

> **`localhost` and LAN IPs cannot pass domain verification.** OpenAI must reach your server over the internet via HTTPS.

---

## Form Fields

### 1. MCP Server URL

```
https://mel-resolve-heavy-perry.trycloudflare.com/mcp
```

Examples:

| Tunnel type | URL |
|---|---|
| Vercel | `https://YOUR_APP.vercel.app/mcp` |
| Quick tunnel (current) | `https://mel-resolve-heavy-perry.trycloudflare.com/mcp` |
| Named tunnel + custom domain | `https://mcp.yourdomain.com/mcp` |
| **NOT valid** | `http://localhost:3030/mcp` — no HTTPS, not reachable by OpenAI |

### 2. Auth

| Setting | Value |
|---|---|
| OpenAI dropdown | **Custom header** |
| Header name | `x-api-key` |
| Header value | `test-key-12345` |

> The server enforces `AUTH_MODE=api_key` from `.env`. The header name **must** be `x-api-key` and the value must match `MCP_API_KEY` in `.env`.

### 3. Scan Tools

Click **Scan Tools**. OpenAI will POST to your `/mcp` endpoint with `tools/list`.
Expected result: **6 tools discovered**:

| Tool | Description |
|---|---|
| `fleet_list_vehicles` | List vehicles with optional status/location filters |
| `fleet_update_status` | Change a vehicle's status |
| `wash_log_create` | Log a vehicle wash |
| `sales_log_create` | Record a sale transaction |
| `report_daily_summary` | Daily KPIs: fleet counts, washes, sales/revenue |
| `knowledge_search` | Search ./knowledge/ markdown files |

### 4. Domain Verification

1. Copy the **verification token** shown in the OpenAI form.

2. Set it on your server (choose ONE method):

   **Option A — File (persists across restarts):**
   ```bash
   cd server
   npm run set:verify-token -- "PASTE_TOKEN_HERE"
   # Restart server if needed
   ```

   **Option B — Environment variable:**
   ```bash
   # Add to .env:
   MCP_VERIFICATION_TOKEN=PASTE_TOKEN_HERE
   # Restart server
   ```

3. Confirm through the tunnel:
   ```bash
   # Must return the exact token as plain text, status 200
   curl -i https://YOUR_PUBLIC_HOSTNAME/.well-known/mcp-verification.txt
   ```

4. Click **Verify Domain** in the OpenAI form.

---

## Pre-Flight Test Commands

Run these **before** clicking Scan Tools / Verify Domain to catch problems early.

```bash
HOST=mel-resolve-heavy-perry.trycloudflare.com
KEY=test-key-12345

# 1. Health (should return {"ok":true,...})
curl -s https://$HOST/health

# 2. Verification token (should return exact token, plain text)
curl -s https://$HOST/.well-known/mcp-verification.txt

# 3. Auth enforcement (should return 401 if AUTH_MODE=api_key)
curl -s -o /dev/null -w '%{http_code}' -X POST https://$HOST/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# 4. tools/list — should return 6 tool names
curl -s --max-time 5 -X POST https://$HOST/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "x-api-key: $KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | grep -o '"name":"[^"]*"'

# 5. tools/call — should return vehicle data
curl -s --max-time 5 -X POST https://$HOST/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "x-api-key: $KEY" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"fleet_list_vehicles","arguments":{}}}'
```

For **local testing** (before the tunnel), replace `https://$HOST` with `http://localhost:3030`.

---

## REST API Endpoints (bonus — not MCP)

The server also exposes a JWT-protected REST API for the web frontend at `/api/v1`:

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/auth/signup` | POST | None | Create user account |
| `/api/v1/auth/login` | POST | None | Login, returns JWT |
| `/api/v1/auth/me` | GET | JWT | Current user info |
| `/api/v1/chat` | POST | JWT | Send message, SSE stream response |
| `/api/v1/models` | GET | JWT | List available AI models |
| `/api/v1/providers` | GET | JWT | List AI providers & status |
| `/api/v1/stats` | GET | JWT | Dashboard statistics |
| `/api/v1/admin/keys` | GET/POST | JWT + admin | Manage API keys |

> These are **not** part of the MCP registration — they power the web UI.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| **Domain not verified** | Token mismatch or wrong path | `curl -i https://YOUR_HOST/.well-known/mcp-verification.txt` — must return exact token, `text/plain`, status 200 |
| **Scan Tools finds 0 tools** | Auth blocking or wrong URL | URL must end in `/mcp` (not `/mcp/`). Check key matches. Try `AUTH_MODE=no_auth` first. |
| **401 Unauthorized** | Missing/wrong `x-api-key` header | Verify `MCP_API_KEY` in `.env` matches the form value. Or set `AUTH_MODE=no_auth`. |
| **Connection refused / timeout** | Server or tunnel not running | Check `curl http://localhost:3030/health` locally. Ensure `cloudflared` is active. |
| **502 Bad Gateway** | Tunnel running but server is down | Start the server: `cd server && npm start` |
| **HTTPS certificate error** | Self-signed cert or no TLS | Cloudflare Tunnel provides valid TLS automatically. Do not use self-signed certs. |
| **Scan Tools hangs** | SSE stream behavior | Normal for MCP SDK. If tools appear in the form, it worked. |
| **Quick tunnel URL changed** | URL changes on each restart | Use a named tunnel for a stable URL, or update the form after restart. |
