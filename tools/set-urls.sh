#!/usr/bin/env bash
# Fills in the real GitHub URLs, then rebuilds the download zip.
# Usage: tools/set-urls.sh <github-user> <repo-name>
set -euo pipefail
[ $# -eq 2 ] || { echo "usage: $0 <github-user> <repo-name>"; exit 1; }
cd "$(dirname "$0")/.."
SITE="https://$1.github.io/$2/"; REPO="https://github.com/$1/$2"
grep -rlE '\{\{(SITE|REPO)_URL\}\}' docs README.md extension | while read -r f; do
  sed -i "s#{{SITE_URL}}#${SITE}#g; s#{{REPO_URL}}#${REPO}#g" "$f"; echo "updated $f"
done
tools/package.sh
