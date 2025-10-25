import { createClient } from "@supabase/supabase-js";
const missingEnvMessage = "[supabaseAdmin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY";
function createSupabaseAdmin() {
    const url = process.env.SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_PROJECT_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(missingEnvMessage);
        }
        return new Proxy({}, {
            get() {
                throw new Error(missingEnvMessage);
            },
        });
    }
    return createClient(url, key, {
        auth: { persistSession: false },
        global: { headers: { "X-Client-Info": "revcover-api-admin" } },
    });
}
export const supabaseAdmin = createSupabaseAdmin();
export default supabaseAdmin;
