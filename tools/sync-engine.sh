#!/usr/bin/env bash
# Keeps the web demo's rules engine identical to the extension's. Run after editing extension/engine.js.
set -euo pipefail
cd "$(dirname "$0")/.."
cp extension/engine.js docs/try/engine.js
echo "synced extension/engine.js -> docs/try/engine.js"
