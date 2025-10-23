import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "";

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SUPABASE_SECRET ??
  "";

if (!url) throw new Error("[supabaseAdmin] Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
if (!serviceKey) throw new Error("[supabaseAdmin] Missing SUPABASE_SERVICE_ROLE_KEY");

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
