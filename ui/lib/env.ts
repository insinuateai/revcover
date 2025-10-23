// ui/lib/env.ts
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_HELIX_API_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const ORG_TOKEN =
  process.env.NEXT_PUBLIC_HELIX_ORG_TOKEN ||
  process.env.ORG_TOKEN ||
  "demo-org";

export const SUPABASE_URL = process.env.SUPABASE_URL!;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
