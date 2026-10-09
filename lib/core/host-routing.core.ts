/**
 * What the proxy does with a request that arrived on the event's own domain.
 *
 * That domain exists to sell one event. It is an allowlist rather than a list
 * of blocked paths so that a platform route written next month is invisible
 * there by default: forgetting to add a rule hides a page, it never exposes
 * one.
 */

export type ProxyDecision =
  | { kind: 'pass' }
  | { kind: 'rewrite'; to: string }
  | { kind: 'block' };

/**
 * Exact paths and path prefixes the event domain answers.
 *
 * The legal pages are here because that domain posts to /api/lead: a form that
 * takes a name and an email needs its privacy policy reachable on the same
 * host, not only on kauaramos.com.
 */
const ALLOWED = ['/connect', '/api/lead', '/privacidade', '/termos'];

export function routeOnEventHost(pathname: string): ProxyDecision {
  if (pathname === '/') return { kind: 'rewrite', to: '/connect' };

  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  for (const prefix of ALLOWED) {
    if (path === prefix) return { kind: 'pass' };
    // /connect/edicoes belongs to the event; /api/lead/export would not.
    if (prefix === '/connect' && path.startsWith('/connect/')) return { kind: 'pass' };
  }

  return { kind: 'block' };
}

/**
 * What robots.txt should say, which depends on which host asked.
 *
 * One deployment serves three different sites, and only one distinction
 * actually matters here: a Vercel preview must be indexed by nobody. Every
 * push creates a new hostname serving the whole site; left open, a search
 * engine ends up holding a dozen copies of the same pages and choosing one of
 * them as the real thing.
 *
 * The two real hosts share a rule. Duplication between them — the event page
 * lives at `/` on the event domain and at `/connect` on the canonical one — is
 * a job for the canonical tag, not for robots.txt, which cannot express "this
 * one is the original".
 *
 * The member area is disallowed everywhere. It is not secret, it is behind a
 * login; it is simply nothing a search result should ever point at.
 */
export type RobotsPlan = { allow: string[]; disallow: string[]; indexable: boolean };

const PRIVATE_PATHS = [
  '/admin',
  '/api/',
  '/auth/',
  '/inicio',
  '/biblioteca',
  '/entrar',
  '/sem-acesso',
];

export function robotsFor(host: string | null | undefined): RobotsPlan {
  const bare = host?.split(':')[0]?.trim().toLowerCase() ?? '';

  // No host at all is the same unknown as a preview: refuse rather than guess.
  if (!bare || bare.endsWith('.vercel.app')) {
    return { allow: [], disallow: ['/'], indexable: false };
  }

  return { allow: ['/'], disallow: PRIVATE_PATHS, indexable: true };
}
