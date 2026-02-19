# Cloudflare Tunnel Setup

> Expose your local MCP server (`http://localhost:3030`) over public HTTPS for free using Cloudflare Tunnel.

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

Or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

Verify installation:

```bash
cloudflared --version
```

---

## Mode A — Quick Tunnel (trycloudflare.com)

No account needed. Ideal for testing and one-off sessions.

### Start

```bash
cloudflared tunnel --url http://localhost:3030
```

### Find the public URL

`cloudflared` prints a line like:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://random-words-here.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

Copy the `https://...trycloudflare.com` URL. This is your public HTTPS endpoint.

### Verify

```bash
curl https://random-words-here.trycloudflare.com/health
# Expected: {"ok":true,"name":"mcp-car-rental","version":"1.0.0"}

curl https://random-words-here.trycloudflare.com/.well-known/mcp-verification.txt
# Expected: your verification token (plain text)
```

### Limitations

- URL changes every time you restart the tunnel.
- Cannot use a custom domain.
- Fine for development and initial OpenAI form testing.

---

## Mode B — Named Tunnel + Custom Domain (Production)

Requires a free Cloudflare account and a domain managed by Cloudflare DNS.

### 1. Authenticate

```bash
cloudflared tunnel login
```

This opens a browser. Select the domain you want to use. A certificate is saved to `~/.cloudflared/cert.pem`.

### 2. Create the tunnel

```bash
cloudflared tunnel create mcpserver
```

Output includes the **Tunnel ID** (a UUID). Note it down. A credentials file is created at:

```
~/.cloudflared/<TUNNEL_ID>.json
```

### 3. Route DNS

```bash
cloudflared tunnel route dns mcpserver app.example.com
```

This creates a CNAME record pointing `app.example.com` → `<TUNNEL_ID>.cfargotunnel.com`.

### 4. Create config file

Copy the example config:

```bash
cp ops/cloudflare/config.example.yml ~/.cloudflared/config.yml
```

Edit `~/.cloudflared/config.yml`:

```yaml
tunnel: mcpserver
credentials-file: /Users/YOUR_USER/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: app.example.com
    service: http://localhost:3030
  - service: http_status:404
```

Replace:
- `YOUR_USER` with your macOS username
- `<TUNNEL_ID>` with the UUID from step 2
- `app.example.com` with your actual domain

### 5. Start the tunnel

```bash
cloudflared tunnel run mcpserver
```

### 6. Verify

```bash
curl https://app.example.com/health
curl https://app.example.com/.well-known/mcp-verification.txt
```

---

## Auto-Start Tunnel as a System Service

### macOS (launchd)

```bash
sudo cloudflared service install
```

This installs a LaunchDaemon at `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist` that starts the tunnel automatically on boot using `~/.cloudflared/config.yml`.

To uninstall:

```bash
sudo cloudflared service uninstall
```

Check status:

```bash
sudo launchctl list | grep cloudflare
```

View logs:

```bash
tail -f /Library/Logs/com.cloudflare.cloudflared.log
```

> **Note:** The system service uses the config file at `~/.cloudflared/config.yml`. Make sure it exists and is correct before installing the service.

### Windows

```powershell
cloudflared service install
```

This registers a Windows Service that starts on boot. Manage it via Services (`services.msc`) or:

```powershell
sc query cloudflared
sc stop cloudflared
sc start cloudflared
```

---

## Combining with MCP Server launchd Service

If you already run the MCP server via launchd (see `ops/macos/install.sh`), the typical boot sequence is:

1. macOS starts → launchd launches the MCP server on `localhost:3030`
2. macOS starts → launchd/LaunchDaemon starts `cloudflared` tunnel
3. Public HTTPS traffic flows: `app.example.com` → Cloudflare → `localhost:3030`

Both services auto-restart independently. No manual intervention after reboot.

---

## OpenAI Registration

Once the tunnel is running and verified:

1. Use `https://app.example.com/mcp` (or your trycloudflare.com URL) as the **MCP Server URL** in the OpenAI form.
2. Follow the steps in [ops/openai-form-pack.md](../openai-form-pack.md) for auth, tool scanning, and domain verification.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `cloudflared: command not found` | Run `brew install cloudflared` (macOS) or reinstall |
| Quick tunnel URL not working | Wait 10-20 seconds after startup. Check that the MCP server is running on port 3030. |
| `failed to connect to origin` | Server not running locally. Start it: `cd server && npm start` |
| DNS not resolving (named tunnel) | Wait for DNS propagation (up to 5 min). Verify CNAME: `dig app.example.com CNAME` |
| `config.yml not found` | Copy `ops/cloudflare/config.example.yml` to `~/.cloudflared/config.yml` and edit it |
| Service install fails (macOS) | Use `sudo`. Ensure `~/.cloudflared/config.yml` exists. |
| Tunnel runs but 502 Bad Gateway | Local server is down or listening on a different port. Check `PORT` in `.env`. |
