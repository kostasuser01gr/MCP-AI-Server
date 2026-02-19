# Cloudflare Tunnel Setup

Expose your local MCP server (`http://localhost:3030`) over public HTTPS — free, no account required for quick tunnels.

---

## Install `cloudflared`

### macOS

```bash
brew install cloudflared
```

### Windows

```powershell
winget install --id Cloudflare.cloudflared
```

Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

Verify:

```bash
cloudflared --version
```

---

## Mode A: Quick Tunnel (trycloudflare.com)

No account, no config, no DNS. Best for testing and short-lived sessions.

### Start

```bash
cloudflared tunnel --url http://localhost:3030
```

### Find Your Public URL

`cloudflared` prints it to the terminal:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://random-words-here.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

Copy the `https://*.trycloudflare.com` URL. This is your public HTTPS endpoint.

### Test

```bash
# Replace with your actual URL
curl https://random-words-here.trycloudflare.com/health
curl https://random-words-here.trycloudflare.com/.well-known/mcp-verification.txt
```

### Limitations

- URL changes every time you restart `cloudflared`
- No custom domain
- Fine for OpenAI registration testing (you can update the URL later)

---

## Mode B: Named Tunnel + Custom Domain (Production)

Requires a **free Cloudflare account** and a **domain managed by Cloudflare DNS**.
The URL stays the same across restarts.

### 1. Authenticate

```bash
cloudflared tunnel login
```

This opens a browser. Select the domain you want to use. A certificate is saved to `~/.cloudflared/cert.pem`.

### 2. Create the Tunnel

```bash
cloudflared tunnel create mcpserver
```

Note the **Tunnel ID** printed (e.g., `a1b2c3d4-...`). A credentials file is saved to:

```
~/.cloudflared/<TUNNEL_ID>.json
```

### 3. Configure DNS

```bash
cloudflared tunnel route dns mcpserver mcp.yourdomain.com
```

This creates a CNAME record pointing `mcp.yourdomain.com` → `<TUNNEL_ID>.cfargotunnel.com`.

### 4. Create Config File

Copy the example config and edit it:

```bash
cp ops/cloudflare/config.example.yml ~/.cloudflared/config.yml
```

Edit `~/.cloudflared/config.yml`:

```yaml
tunnel: mcpserver
credentials-file: /Users/YOUR_USER/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: mcp.yourdomain.com
    service: http://localhost:3030
  - service: http_status:404
```

Replace:
- `<TUNNEL_ID>` with your actual tunnel ID
- `mcp.yourdomain.com` with your actual subdomain
- `/Users/YOUR_USER` with your home directory path

### 5. Run the Named Tunnel

```bash
cloudflared tunnel run mcpserver
```

### 6. Test

```bash
curl https://mcp.yourdomain.com/health
curl https://mcp.yourdomain.com/.well-known/mcp-verification.txt
```

---

## Auto-Start the Tunnel as a System Service

### macOS

```bash
sudo cloudflared service install
```

This installs a LaunchDaemon that starts `cloudflared` on boot using `~/.cloudflared/config.yml`.

To uninstall:

```bash
sudo cloudflared service uninstall
```

Check status:

```bash
sudo launchctl list | grep cloudflared
```

Logs:

```bash
tail -f /Library/Logs/com.cloudflare.cloudflared.log
```

> **Note:** The service runs the **named tunnel** from `~/.cloudflared/config.yml`. Quick tunnels (`--url` mode) cannot be installed as a service.

### Windows

```powershell
cloudflared service install
```

This registers a Windows Service. It starts automatically on boot.

To uninstall:

```powershell
cloudflared service uninstall
```

---

## Verification Compatibility

OpenAI domain verification requires:

1. **Public HTTPS** — `localhost` and LAN IPs will not work.
2. **Plain text response** — `GET /.well-known/mcp-verification.txt` must return the token as `text/plain`, no HTML, no redirects.
3. **Exact match** — No trailing newline, no extra whitespace around the token.

### Set the verification token

```bash
cd server
npm run set:verify-token -- "TOKEN_FROM_OPENAI"
```

Or set `MCP_VERIFICATION_TOKEN=TOKEN_FROM_OPENAI` in `.env` and restart.

### Verify it works through the tunnel

```bash
# Must return the exact token, status 200, content-type text/plain
curl -i https://YOUR_PUBLIC_HOSTNAME/.well-known/mcp-verification.txt

# Must return {"ok":true,...}
curl https://YOUR_PUBLIC_HOSTNAME/health
```

---

## Running Both Server + Tunnel

Open two terminals:

```bash
# Terminal 1: Start server
cd server && npm start

# Terminal 2: Start tunnel
cloudflared tunnel --url http://localhost:3030
# or for named tunnel:
cloudflared tunnel run mcpserver
```

Or with the launchd service (server) + cloudflared service (tunnel), both start automatically at login/boot.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `cloudflared: command not found` | Not installed | `brew install cloudflared` |
| Tunnel starts but URL unreachable | Server not running on port 3030 | Start the server first: `cd server && npm start` |
| `502 Bad Gateway` in browser | Server crashed or wrong port | Check `curl http://localhost:3030/health` locally |
| DNS not resolving (named tunnel) | CNAME not created | Run `cloudflared tunnel route dns mcpserver mcp.yourdomain.com` |
| Service won't start | No config.yml | Create `~/.cloudflared/config.yml` (see step 4 above) |
| Quick tunnel URL changed | Normal — URL changes on restart | Use a named tunnel for a stable URL |
| Verification returns HTML | Cloudflare is serving an error page | Ensure server is running and returning plain text at the path |
