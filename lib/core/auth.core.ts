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
