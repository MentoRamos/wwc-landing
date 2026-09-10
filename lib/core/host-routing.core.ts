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

/** Exact paths and path prefixes the event domain answers. */
const ALLOWED = ['/connect', '/api/lead'];

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
