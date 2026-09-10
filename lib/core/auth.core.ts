/**
 * Pure helpers for the sign-in round trip. Nothing here touches Supabase, the
 * request or the environment, so every rule below is asserted directly.
 */

/** Where someone lands when we have nowhere better to send them. */
export const DEFAULT_AFTER_LOGIN = '/inicio';

/** Paths that would bounce a person straight back into signing in. */
const DOORS = ['/entrar', '/auth'];

/** Control characters, which is how a header gets smuggled into a redirect. */
const CONTROL = /[\u0000-\u001F\u007F]/;

/**
 * The `?next=` parameter, reduced to something safe to redirect to.
 *
 * A stranger writes this value, so the only shape accepted is a path on this
 * site: one leading slash, no scheme, no second slash or backslash (browsers
 * read `//host` and `/\host` as another origin), and no control characters.
 * Anything else silently becomes the default rather than an error, because a
 * tampered link should still sign the person in — just not somewhere else.
 */
export function safeNextPath(raw: string | null | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_AFTER_LOGIN;

  if (CONTROL.test(value)) return DEFAULT_AFTER_LOGIN;
  if (value[0] !== '/') return DEFAULT_AFTER_LOGIN;
  if (value[1] === '/' || value[1] === '\\') return DEFAULT_AFTER_LOGIN;

  const path = value.split(/[?#]/, 1)[0];
  if (DOORS.some((door) => path === door || path.startsWith(`${door}/`))) {
    return DEFAULT_AFTER_LOGIN;
  }

  return value;
}

/** Preview deployments of this project, which get a fresh host every push. */
const PREVIEW_SUFFIX = '.vercel.app';

/**
 * The origin the browser is actually looking at.
 *
 * The platform is served through a rewrite from the static site, so a route
 * handler can see the deployment's internal URL while the person's address bar
 * says `kauaramos.com`. Redirecting them to the URL the handler saw would drop
 * them on a domain their session cookie does not exist on: signed in, and
 * shown as signed out.
 *
 * The forwarded host is a header, so it is a claim, not a fact — it is honoured
 * only for hosts we already answer on, and otherwise ignored. Trusting it
 * outright turns this into an open redirect.
 */
export function resolveCallbackOrigin(input: {
  requestOrigin: string;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  allowedHosts: string[];
}): string {
  const host = firstHop(input.forwardedHost);
  if (!host) return input.requestOrigin;

  const allowed =
    input.allowedHosts.some((candidate) => candidate.trim().toLowerCase() === host) ||
    host.endsWith(PREVIEW_SUFFIX);
  if (!allowed) return input.requestOrigin;

  const proto = firstHop(input.forwardedProto) === 'http' ? 'http' : 'https';

  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return input.requestOrigin;
  }
}

/** The first entry of a `a, b, c` proxy header, if it looks like a hostname. */
function firstHop(raw: string | null | undefined): string | undefined {
  const value = raw?.split(',')[0]?.trim().toLowerCase();
  if (!value) return undefined;
  return /^[a-z0-9.-]+(:\d+)?$/.test(value) ? value : undefined;
}
