import type { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { publicSupabaseEnv } from './env';
import type { CookieOptions } from '@supabase/ssr';

type PendingCookie = { name: string; value: string; options: CookieOptions };

/**
 * The cookies and headers a token refresh wants written to the response.
 *
 * Collected rather than written directly because the proxy decides what kind
 * of response it is returning — pass, rewrite or redirect — only after the
 * refresh has happened.
 */
export type SessionRefresh = {
  cookies: PendingCookie[];
  headers: Record<string, string>;
};

/**
 * Renew the session on the way past.
 *
 * Access tokens are short-lived; something has to trade the refresh token for
 * a new one and hand it back to the browser. Server Components cannot write
 * cookies, so if this does not happen here it does not happen at all — and the
 * symptom is not an error, it is people quietly getting logged out.
 *
 * This makes no access decision. Deciding who may see what in a proxy is the
 * shape of bug CVE-2025-29927 exploited; authorization lives in RLS, which
 * answers the query itself.
 */
export async function refreshSession(request: NextRequest): Promise<SessionRefresh> {
  const refresh: SessionRefresh = { cookies: [], headers: {} };
  const { url, anonKey } = publicSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        refresh.cookies.push(...toSet);
        Object.assign(refresh.headers, headers);
      },
    },
  });

  // Reaching the auth server is what triggers the refresh. `getUser` rather
  // than `getSession` because it validates the token instead of trusting the
  // cookie; the result is deliberately unused here.
  await supabase.auth.getUser();

  return refresh;
}

/**
 * Copy a refresh onto whatever response the proxy settled on.
 *
 * The headers matter as much as the cookies: they tell every CDN in front of
 * us not to store this response. A cached response that carries a `Set-Cookie`
 * hands one person's session to the next visitor.
 */
export function applyRefresh<T extends NextResponse>(response: T, refresh: SessionRefresh): T {
  for (const { name, value, options } of refresh.cookies) {
    response.cookies.set(name, value, options);
  }
  for (const [name, value] of Object.entries(refresh.headers)) {
    response.headers.set(name, value);
  }
  return response;
}
