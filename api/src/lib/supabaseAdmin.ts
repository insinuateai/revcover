import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url) throw new Error('[supabaseAdmin] Missing NEXT_PUBLIC_SUPABASE_URL');
if (!serviceRole) throw new Error('[supabaseAdmin] Missing SUPABASE_SERVICE_ROLE_KEY');

// Disable session persistence; this is a server-side client
export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { persistSession: false },
});
