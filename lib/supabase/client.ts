'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicSupabaseEnv } from './env';

let cached: SupabaseClient | undefined;

/**
 * The browser's Supabase client.
 *
 * It writes the session into cookies rather than local storage, which is the
 * whole point: the server reads the same cookies, so a page rendered on the
 * server already knows who is asking. The PKCE verifier travels the same way,
 * which is what lets `/auth/callback` complete a sign-in the browser started.
 *
 * One instance per tab. Two clients would each run their own refresh timer and
 * race to write the same cookie.
 */
export function browserClient(): SupabaseClient {
  if (!cached) {
    const { url, anonKey } = publicSupabaseEnv();
    cached = createBrowserClient(url, anonKey);
  }
  return cached;
}
