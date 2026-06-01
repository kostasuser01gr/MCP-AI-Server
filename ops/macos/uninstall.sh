#!/usr/bin/env bash
set -euo pipefail

LABEL="com.kostas.mcp-ai-server"
PLIST_DST="$HOME/Library/LaunchAgents/$LABEL.plist"

echo "-- MCP AI Server macOS Service Uninstaller --"

# Stop and unload
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null && echo "✓ Service stopped" || echo "  Service was not running"

# Remove plist
if [[ -f "$PLIST_DST" ]]; then
  rm "$PLIST_DST"
  echo "✓ Removed $PLIST_DST"
else
  echo "  Plist not found (already removed)"
fi

echo ""
echo "── Uninstalled ──"
echo "  Logs remain at: ~/Library/Logs/mcp-ai-server/"
echo "  Database remains at: ./data/app.db"
echo "  To remove everything: rm -rf ~/Library/Logs/mcp-ai-server ./data"
