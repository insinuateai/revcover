#!/usr/bin/env bash
set -euo pipefail

make env
pnpm install
pnpm approve-builds || true
echo "[bootstrap] Ready. Run: make dev"
