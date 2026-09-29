#!/usr/bin/env bash
set -euo pipefail
export PATH="/data/tools/node/bin:$PATH"
cd /data/mqlt/console-web
npm run build
