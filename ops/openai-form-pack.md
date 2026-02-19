# OpenAI Platform — MCP Server Form Fill Pack

> Step-by-step values for the OpenAI "MCP Server" registration form.
> Assumes the server is already running and exposed via **Cloudflare Tunnel** (free).

---

## Prerequisites

| Requirement | How |
|---|---|
| Server running | `cd server && npm start` |
| `cloudflared` installed | `brew install cloudflared` (macOS) or `winget install Cloudflare.cloudflared` (Windows) |
| Public HTTPS URL | `cloudflared tunnel --url http://localhost:3030` (quick tunnel) or named tunnel — see [ops/cloudflare/setup.md](../cloudflare/setup.md) |
| Verification token | Provided by the OpenAI form (step 4 below) |

> **`localhost` and LAN IPs cannot pass domain verification.** OpenAI must reach your server over the internet via HTTPS. Cloudflare Tunnel provides this for free.

---

## Form Fields

### 1. MCP Server URL

```
https://<YOUR_PUBLIC_HOSTNAME>/mcp
```

Examples:

| Tunnel type | URL |
|---|---|
| Quick tunnel | `https://random-words-here.trycloudflare.com/mcp` |
| Named tunnel + custom domain | `https://mcp.yourdomain.com/mcp` |
| **NOT valid** | `http://localhost:3030/mcp` — no HTTPS, not reachable by OpenAI |

### 2. Auth

| Your `.env` `AUTH_MODE` | OpenAI dropdown | What to enter |
|---|---|---|
| `no_auth` | **No Auth** | Nothing else needed |
| `api_key` | **Custom header** | Header: `x-api-key`  •  Value: your `MCP_API_KEY` from `.env` |

> The OpenAI form may show "API Key" or "Custom header" — either works. The critical part is that the header name is `x-api-key` and the value matches `MCP_API_KEY` in your `.env`.

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

Replace `YOUR_HOST` with your public hostname (e.g., `random-words.trycloudflare.com`)
and `YOUR_KEY` with your `MCP_API_KEY`.

```bash
# 1. Health (should return {"ok":true,...})
curl -s https://YOUR_HOST/health

# 2. Verification token (should return exact token, plain text)
curl -s https://YOUR_HOST/.well-known/mcp-verification.txt

# 3. Auth enforcement (should return 401 if AUTH_MODE=api_key)
curl -s -o /dev/null -w '%{http_code}' -X POST https://YOUR_HOST/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# 4. tools/list — should return 6 tool names
curl -s --max-time 5 -X POST https://YOUR_HOST/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'x-api-key: YOUR_KEY' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | grep -o '"name":"[^"]*"'

# 5. tools/call — should return vehicle data
curl -s --max-time 5 -X POST https://YOUR_HOST/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'x-api-key: YOUR_KEY' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"fleet_list_vehicles","arguments":{}}}'
```

For **local testing** (before the tunnel), replace `https://YOUR_HOST` with `http://localhost:3030`.

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
