# OpenAI Platform — MCP Server Form Fill Pack

> Step-by-step values for the OpenAI "MCP Server" registration form.
> Assumes the server is already running and exposed via public HTTPS.

---

## Prerequisites

| Requirement | How |
|---|---|
| Server running | `cd server && npm start` |
| Public HTTPS URL | Use **Cloudflare Tunnel** (free): `cloudflared tunnel --url http://localhost:3030` |
| Verification token | Provided by the OpenAI form (step 2 below) |

> **Local-only URLs (`localhost`, `192.168.*`) cannot pass domain verification.** OpenAI must reach your server over the internet via HTTPS.

---

## Form Fields

### 1. MCP Server URL

```
https://YOUR_HOSTNAME/mcp
```

Examples:
- Cloudflare Tunnel: `https://random-words.trycloudflare.com/mcp`
- Custom domain: `https://mcp.yourdomain.com/mcp`
- **NOT valid**: `http://localhost:3030/mcp` (no HTTPS, not reachable)

### 2. Auth

| Your `.env` AUTH_MODE | OpenAI dropdown | Additional config |
|---|---|---|
| `no_auth` | **No Auth** | — |
| `api_key` | **API Key** | Header name: `x-api-key`, Value: your `MCP_API_KEY` |

> If the OpenAI form shows "Custom header" instead of "API Key", enter:
> - Header: `x-api-key`
> - Value: *(your MCP_API_KEY value)*

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

3. Confirm it works:
   ```bash
   # Must return the exact token, plain text, no extra whitespace
   curl https://YOUR_HOSTNAME/.well-known/mcp-verification.txt
   ```

4. Click **Verify Domain** in the OpenAI form.

---

## Pre-Flight Verification Commands

Run these **before** clicking Scan Tools / Verify Domain to ensure everything works.

Replace `YOUR_HOSTNAME` with your actual public hostname and `YOUR_KEY` with your `MCP_API_KEY`.

```bash
# 1. Health check
curl -s https://YOUR_HOSTNAME/health
# Expected: {"ok":true,"name":"mcp-car-rental","version":"1.0.0"}

# 2. Verification token
curl -s https://YOUR_HOSTNAME/.well-known/mcp-verification.txt
# Expected: your exact token, nothing else

# 3. Auth enforcement (should return 401 if AUTH_MODE=api_key)
curl -s -o /dev/null -w '%{http_code}' -X POST https://YOUR_HOSTNAME/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
# Expected: 401

# 4. tools/list (with auth)
curl -s --max-time 5 -X POST https://YOUR_HOSTNAME/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'x-api-key: YOUR_KEY' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | grep -o '"name":"[^"]*"'
# Expected: 6 tool names

# 5. tools/call (quick test)
curl -s --max-time 5 -X POST https://YOUR_HOSTNAME/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'x-api-key: YOUR_KEY' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"fleet_list_vehicles","arguments":{}}}'
# Expected: SSE response with vehicle data
```

For **local testing** (before exposing), replace `https://YOUR_HOSTNAME` with `http://localhost:3030`.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| **Domain not verified** | Token mismatch or not served at correct path | Run `curl https://YOUR_HOSTNAME/.well-known/mcp-verification.txt` — must return exact token, no HTML, no redirects, status 200 |
| **Scan Tools finds 0 tools** | Auth blocking the request, or wrong URL | Check that the URL ends in `/mcp` (not `/mcp/`). If using API Key auth, ensure the key matches. Try with `AUTH_MODE=no_auth` first. |
| **401 Unauthorized** | Missing or wrong `x-api-key` header | Verify `MCP_API_KEY` in `.env` matches what you entered in the OpenAI form. Or set `AUTH_MODE=no_auth`. |
| **Connection refused / timeout** | Server not running or not publicly reachable | Check `curl http://localhost:3030/health` locally first. Ensure tunnel is active. |
| **HTTPS certificate error** | Self-signed cert or no HTTPS | Use Cloudflare Tunnel (provides valid TLS automatically). Do not use self-signed certs. |
| **Scan Tools hangs** | SSE stream not closing | This is normal for MCP SDK — OpenAI handles SSE. If tools appear, it worked. |
| **"Invalid Request: Only one initialization request"** | Client sent batched init+request | Server handles single JSON-RPC requests in stateless mode. OpenAI's client does this correctly. |
