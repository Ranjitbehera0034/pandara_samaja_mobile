#!/usr/bin/env bash
# Publishes a JS/TS-only OTA update to BOTH real channels back to back.
#
# Why this exists: eas.json defines three channels (development/preview/
# production) but there's no single `eas update` invocation that reaches
# both preview (what test builds run) and production (what real members
# run) — publishing is two separate manual commands. That gap already
# caused a real incident: a fix was published to production only and
# silently left the preview test build stale. This script makes "publish
# everywhere" the only option, not a discipline to remember.
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: npm run publish:ota -- \"<update message>\""
  exit 1
fi

MESSAGE="$1"

echo "==> Publishing to production..."
npx eas-cli update --channel production --message "$MESSAGE" --non-interactive

echo ""
echo "==> Publishing to preview..."
npx eas-cli update --channel preview --message "$MESSAGE" --non-interactive

echo ""
echo "Done — published to both production and preview."
