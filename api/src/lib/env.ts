// api/src/lib/env.ts
import assert from "node:assert";

const required = [
  "PORT",
  "NODE_ENV",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE",
];

for (const v of required) {
  assert(process.env[v], `Missing required env: ${v}`);
}

export const ENV = {
  PORT: Number(process.env.PORT ?? 3001),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE!,
};
