#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPANION_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="com.clarity.companion"
PLIST_SRC="$COMPANION_DIR/$PLIST_NAME.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

echo "Clarity Companion Installer"
echo "==========================="
echo ""

# Check prerequisites
if ! command -v tsx &> /dev/null && [ ! -f "$COMPANION_DIR/node_modules/.bin/tsx" ]; then
  echo "Installing dependencies..."
  cd "$COMPANION_DIR" && npm install
fi

# Check for .env file
if [ ! -f "$COMPANION_DIR/.env" ]; then
  echo ""
  echo "ERROR: No .env file found at $COMPANION_DIR/.env"
  echo ""
  echo "Create one with:"
  echo "  CLARITY_API_URL=https://clarity.jbcloud.app"
  echo "  COMPANION_TOKEN=<your-session-token>"
  echo ""
  exit 1
fi

# Create logs directory
mkdir -p "$COMPANION_DIR/logs"

# Generate plist with resolved paths
sed "s|__COMPANION_DIR__|$COMPANION_DIR|g" "$PLIST_SRC" > "$PLIST_DEST"
echo "Installed plist: $PLIST_DEST"

# Unload if already loaded
launchctl bootout "gui/$(id -u)/$PLIST_NAME" 2>/dev/null || true

# Load the service
launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST"
echo "Service loaded: $PLIST_NAME"

echo ""
echo "Companion is now running. Check status with:"
echo "  launchctl print gui/$(id -u)/$PLIST_NAME"
echo ""
echo "View logs:"
echo "  tail -f $COMPANION_DIR/logs/companion.log"
echo ""
echo "IMPORTANT: Grant Reminders access when prompted, or enable at:"
echo "  System Settings > Privacy & Security > Automation > Terminal > Reminders"
