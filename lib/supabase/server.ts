import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicSupabaseEnv } from './env';

/**
 * A Supabase client that acts as the person making the request.
 *
 * This is the client every page and route should use, because it is what makes
 * the query the authorization: it carries the visitor's own JWT, so RLS decides
 * what comes back and a missing entitlement shows up as zero rows rather than
 * as a permission check somebody has to remember to write.
 *
 * A new client per request, never a module-level one — a shared client would
 * serve one person's session to the next request.
 */
export async function serverClient(): Promise<SupabaseClient> {
  const { url, anonKey } = publicSupabaseEnv();
  const store = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            store.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. That is fine and expected:
          // the proxy runs on every matched request and refreshes the session
          // there, so the rotated token still reaches the browser. Throwing
          // here would turn an ordinary page render into a 500.
        }
      },
    },
  });
}
