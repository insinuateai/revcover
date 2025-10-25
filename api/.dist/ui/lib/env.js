// ui/lib/env.ts
export const REVCOVER_API_URL = process.env.NEXT_PUBLIC_HELIX_API_URL ||
    process.env.HELIX_API_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    "https://api.revcover.ai";
export const ORG_TOKEN = process.env.NEXT_PUBLIC_HELIX_ORG_TOKEN ||
    process.env.ORG_TOKEN ||
    "demo-org";
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
if (!REVCOVER_API_URL || !ORG_TOKEN) {
    console.warn("[env] Missing required environment variables: REVCOVER_API_URL or ORG_TOKEN");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[env] Missing required Supabase environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}
