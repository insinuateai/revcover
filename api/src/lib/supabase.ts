// api/src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env.js";

export const supabaseAdmin = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});
