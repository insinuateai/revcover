#!/usr/bin/env bash
set -euo pipefail

# Ensure required env files exist with safe templates (don’t overwrite if present)

root="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

# API
api_env="$root/api/.env.local"
if [[ ! -f "$api_env" ]]; then
  cat > "$api_env" <<'EOF'
# --- Supabase (server only) ---
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=supr_srv_role_key_XXXXXXXXXXXXXXXXXXXXXXXX

# (Optional direct Postgres if used)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME

# --- Stripe (server only) ---
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXX

# --- Misc ---
PORT=4011
NODE_ENV=development
EOF
  echo "[env_guard] Wrote api/.env.local (edit real values)"
fi

# UI
ui_env="$root/ui/.env.local"
if [[ ! -f "$ui_env" ]]; then
  cat > "$ui_env" <<'EOF'
# --- Supabase (public) ---
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...

# --- API URL (optional if UI proxies server-side) ---
NEXT_PUBLIC_HELIX_API_URL=http://localhost:4011
EOF
  echo "[env_guard] Wrote ui/.env.local (edit real values)"
fi

echo "[env_guard] Env check complete."
