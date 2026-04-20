import { createClient } from '@supabase/supabase-js';

/**
 * Client con service role — bypassa RLS.
 * Usare SOLO in Server Components / Route Handlers lato server.
 * Non esporre mai al browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
