/**
 * Server-only Supabase admin client.
 * NOTE: This file MUST NOT be imported by client components.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const missingEnvMessage =
  "[supabaseAdmin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY";

function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only

  if (!url || !key) {
    // Avoid crashing builds (e.g. Vercel preview without secrets) but make failures obvious at runtime.
    if (process.env.NODE_ENV !== "production") {
      console.warn(missingEnvMessage);
    }

    return new Proxy(
      {},
      {
        get() {
          throw new Error(missingEnvMessage);
        },
      },
    ) as SupabaseClient;
  }

  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "revcover-ui-admin" } },
  });
}

export const supabaseAdmin = createSupabaseAdmin();

export default supabaseAdmin;
