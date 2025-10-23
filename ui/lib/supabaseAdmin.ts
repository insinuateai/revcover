/**
 * Server-only Supabase admin client.
 * NOTE: This file MUST NOT be imported by client components.
 */
import { createClient } from '@supabase/supabase-js';

// These are required on Vercel (Project → Settings → Environment Variables)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only

if (!url) throw new Error('[supabaseAdmin] Missing NEXT_PUBLIC_SUPABASE_URL');
if (!key) throw new Error('[supabaseAdmin] Missing SUPABASE_SERVICE_ROLE_KEY');

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false },
  global: { headers: { 'X-Client-Info': 'revcover-ui-admin' } },
});

export default supabaseAdmin;
