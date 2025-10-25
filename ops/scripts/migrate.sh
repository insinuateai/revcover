#!/usr/bin/env bash
set -euo pipefail
for f in $(ls ops/sql/migrations/*.sql 2>/dev/null || true); do
  echo "Applying $f"
  # psql "$DATABASE_URL" -f "$f"
done
echo "✅ Migrations applied (placeholder)"
