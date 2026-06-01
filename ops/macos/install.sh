#!/usr/bin/env bash
set -euo pipefail

LABEL="com.kostas.mcp-ai-server"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLIST_SRC="$SCRIPT_DIR/$LABEL.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs/mcp-ai-server"

echo "-- MCP AI Server macOS Service Installer --"

# Detect npm
NPM_PATH="$(which npm 2>/dev/null || true)"
if [[ -z "$NPM_PATH" ]]; then
  echo "❌ npm not found in PATH. Install Node.js first."
  exit 1
fi

NODE_BIN_DIR="$(dirname "$NPM_PATH")"
echo "✓ npm found at $NPM_PATH"
echo "  Project: $PROJECT_DIR"

# Create log directory
mkdir -p "$LOG_DIR"
echo "✓ Log dir: $LOG_DIR"

# Build the project
echo "── Building server..."
cd "$PROJECT_DIR/server"
npm ci --prefer-offline
npm run build
echo "✓ Build complete"

# Copy and patch plist
echo "── Installing LaunchAgent..."

# Unload if already loaded
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true

sed \
  -e "s|__NPM_PATH__|$NPM_PATH|g" \
  -e "s|__PROJECT_DIR__|$PROJECT_DIR|g" \
  -e "s|__NODE_BIN_DIR__|$NODE_BIN_DIR|g" \
  -e "s|__HOME__|$HOME|g" \
  "$PLIST_SRC" > "$PLIST_DST"

echo "✓ Plist written to $PLIST_DST"

# Ensure .env exists
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  echo "⚠  Created .env from .env.example — edit it to set MCP_API_KEY"
fi

# Load
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
echo "✓ Service loaded and running"

echo ""
echo "── Done! ──"
echo "  Status:  launchctl print gui/$(id -u)/$LABEL"
echo "  Logs:    tail -f $LOG_DIR/out.log"
echo "  Errors:  tail -f $LOG_DIR/err.log"
echo "  Health:  curl http://localhost:3030/health"
echo "  Stop:    launchctl bootout gui/$(id -u)/$LABEL"
