import { NextResponse, type NextRequest } from 'next/server';
import { isEventHost } from '@/lib/core/site.core';
import { routeOnEventHost } from '@/lib/core/host-routing.core';
import { applyRefresh, refreshSession } from '@/lib/supabase/proxy-session';
import { eventHost } from '@/lib/supabase/env';

/**
 * Two jobs, and deliberately no third: renew the session cookie, and decide
 * which of the two domains this request arrived on. No access check lives
 * here — the proxy runs before rendering and in front of a CDN, which is
 * exactly the place a forgotten route slips past. RLS answers that question,
 * inside the query.
 *
 * In Next 16 this file is `proxy.ts`. A leftover `middleware.ts` compiles,
 * type-checks and never runs, so `npm run prebuild` fails the build if one
 * appears.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get('host');

  // The event's own domain is a marketing site: nothing to sign into, so
  // nothing to refresh, and every platform path is simply not there.
  if (isEventHost(host, eventHost())) {
    const decision = routeOnEventHost(request.nextUrl.pathname);

    if (decision.kind === 'rewrite') {
      return NextResponse.rewrite(new URL(decision.to, request.url));
    }
    if (decision.kind === 'block') {
      // Home rather than a 404: on a domain that sells one event, an address
      // nobody recognises should land on the event, and this way the response
      // says nothing about which platform routes happen to exist.
      return NextResponse.redirect(new URL('/', request.url), 307);
    }
    return NextResponse.next();
  }

  const refresh = await refreshSession(request);

  // Server Components are not told which URL they are rendering, and the
  // sign-in page needs it to send someone back where they were headed. Set,
  // never appended: the header a client sends is overwritten here, and
  // `safeNextPath` still sanitises it before it becomes a redirect.
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname + request.nextUrl.search);

  return applyRefresh(NextResponse.next({ request: { headers } }), refresh);
}

/**
 * Which requests reach the proxy: everything except Next's build output and
 * any request for a file with an extension, which is how `/photos/*.png` and
 * `/icon.svg` are served straight off disk.
 *
 * Written out as a literal because Turbopack parses this at build time and
 * silently ignores a value it cannot read statically — a matcher that stops
 * covering a route raises no error, people just start getting logged out on
 * it. `tests/proxy-matcher.test.ts` reads this file and asserts the literal.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.[\\w]+$).*)'],
};
