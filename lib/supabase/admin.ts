import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicSupabaseEnv, serviceRoleKey } from './env';

/**
 * The client that ignores row level security.
 *
 * Only two things in this codebase have any business calling it: the billing
 * webhook, which writes an entitlement for someone who is not signed in, and
 * the download route, which signs a storage URL *after* the user's own client
 * has already proven the right to the file. Anything else should read as the
 * user and let RLS answer.
 *
 * Reaching for this to "just make the query work" is how a page ends up
 * returning another member's rows.
 */
export function adminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('adminClient() was imported into the browser bundle.');
  }

  const { url } = publicSupabaseEnv();
  return createClient(url, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
