# Deploy MCP/API on Vercel (Root-Only)

> Zero-charge guardrail: this guide changes hosted Vercel state. Do not run these commands unless deployment is explicitly approved and billing exposure is acceptable.

This project deploys the **MCP/API server only** on Vercel.
The Next.js client is out of scope for this Vercel project.

## 1. Project shape (required)

Deploy from repo root (`Root Directory = .`) using:

- `vercel.json` (root)
- `api/index.ts` (root)
- root `package.json` with `vercel-build`

Do not deploy from `server/`.

## 2. Configure environment variables

Set these in Vercel Project Settings -> Environment Variables:

- `MCP_API_KEY` (required in production when `AUTH_MODE=api_key`)
- `AUTH_MODE=api_key`
- `JWT_SECRET` (required in production, non-placeholder)
- `MCP_VERIFICATION_TOKEN` (from OpenAI form)
- `DB_PATH=/tmp/app.db`
- `CLIENT_ORIGIN=https://YOUR_APP.vercel.app` (or your own client domain)
- `LOG_LEVEL=info`

Notes:

- `DB_PATH=/tmp/app.db` is required for serverless filesystem constraints.
- `/tmp` is ephemeral on Vercel.

## 3. Deployment protection policy (critical)

OpenAI MCP scanning and remote clients require a publicly reachable URL.

In Vercel Project Settings, disable Vercel Authentication for:

- Production deployment URLs
- Production aliases

If your org policy requires protection on deployment URLs, use the canonical public alias only and do not use deployment-specific URLs in OpenAI.

## 4. Deploy

From repo root:

```bash
vercel --prod
```

## 5. Verify endpoints

Replace `YOUR_APP.vercel.app`:

```bash
curl -si https://YOUR_APP.vercel.app/health
curl -si https://YOUR_APP.vercel.app/.well-known/mcp-verification.txt
curl -si -X POST https://YOUR_APP.vercel.app/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'x-api-key: <MCP_API_KEY>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Expected:

- `/health` -> `200`
- `/.well-known/mcp-verification.txt` -> `200` with exact token
- `/mcp` with valid key -> `200` JSON-RPC response

## 6. OpenAI MCP form values

- MCP Server URL: `https://YOUR_APP.vercel.app/mcp`
- Auth: Custom header
- Header name: `x-api-key`
- Header value: same as `MCP_API_KEY`

## 7. Troubleshooting

- `401 Authentication Required` on alias URL:
  - You are hitting a protected Vercel alias. Use canonical public alias or disable protection.
- `404 NOT_FOUND`:
  - Check root `vercel.json`, root `api/index.ts`, and root directory set to `.`
- `FUNCTION_INVOCATION_FAILED`:
  - Check Vercel runtime logs and validate production env vars.
- `No tools found` in OpenAI:
  - Verify URL is `/mcp`, `x-api-key` matches, and endpoint is publicly reachable.
