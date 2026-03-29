#!/bin/bash
set -euo pipefail

PLIST_NAME="com.clarity.companion"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

echo "Uninstalling Clarity Companion..."

launchctl bootout "gui/$(id -u)/$PLIST_NAME" 2>/dev/null || true
rm -f "$PLIST_DEST"

echo "Service stopped and plist removed."
