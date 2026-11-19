#!/usr/bin/env bash
# Builds the downloadable extension zip. Usage: tools/package.sh
set -euo pipefail
cd "$(dirname "$0")/.."
v=$(python3 -c "import json;print(json.load(open('extension/manifest.json'))['version'])")
mkdir -p docs/download
rm -f docs/download/adcheck-extension-*.zip
( cd extension && zip -qr "../docs/download/adcheck-extension-v${v}.zip" . -x "*.DS_Store" )
echo "built docs/download/adcheck-extension-v${v}.zip"
