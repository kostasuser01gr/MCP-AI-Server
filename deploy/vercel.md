# Deploy MCP Server on Vercel

Use this when you want a stable public HTTPS endpoint for OpenAI MCP without running your own tunnel process.

## 1. Create a Vercel project

1. Import this repo in Vercel.
2. Keep **Root Directory** as repo root (default), or set it to `server`.
3. Keep framework preset as **Other**.

This repo includes both:

- `vercel.json` (repo root) for default-root deployments.
- `server/vercel.json` for `server` root-directory deployments.

## 2. Configure environment variables

Set these in Vercel Project Settings → Environment Variables:

- `MCP_API_KEY` = strong random value
- `AUTH_MODE` = `api_key`
- `JWT_SECRET` = long random value
- `MCP_VERIFICATION_TOKEN` = token from OpenAI MCP form
- `DB_PATH` = `/tmp/app.db`
- `CLIENT_ORIGIN` = your client URL (optional for MCP-only usage)

Notes:

- `DB_PATH=/tmp/app.db` is required for Vercel serverless runtime.
- `/tmp` is ephemeral. Data can reset after cold starts/redeploys.

## 3. Deploy

Deploy from Vercel UI, or with CLI from `server/`:

```bash
vercel --prod
```

## 3.1 If you see `404: NOT_FOUND` after deploy

This usually means Vercel deployed with no function routes.

1. Open **Project Settings → General** and confirm Root Directory is either repo root or `server`.
2. Open **Deployments → Latest deployment → Functions** and confirm one function exists:
   - root mode: `server/api/index.ts`
   - server mode: `api/index.ts`
3. Redeploy:

```bash
vercel --prod --force
```

## 4. Verify endpoints

Replace `YOUR_APP.vercel.app`:

```bash
curl -s https://YOUR_APP.vercel.app/health
curl -s https://YOUR_APP.vercel.app/.well-known/mcp-verification.txt
curl -s -X POST https://YOUR_APP.vercel.app/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'x-api-key: <MCP_API_KEY>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## 5. OpenAI MCP form values

- **MCP Server URL**: `https://YOUR_APP.vercel.app/mcp`
- **Auth**: Custom header
- **Header name**: `x-api-key`
- **Header value**: the exact `MCP_API_KEY` from Vercel env vars

## 6. Important limitation

This project currently uses SQLite. On Vercel serverless, SQLite state is not durable.
For production persistence, move to a managed database and update storage logic.
