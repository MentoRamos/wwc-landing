/**
 * Pure helpers for resolving where this app is being served from.
 *
 * The app answers on more than one host: the platform domain and the event's
 * own domain. Nothing here reads process.env directly so it stays testable and
 * so no third party domain can be hardcoded into metadata again.
 */

type Env = {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
};

const LOCAL_FALLBACK = 'http://localhost:3000';

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function withProtocol(host: string): string {
  return /^https?:\/\//i.test(host) ? host : `https://${host}`;
}

/** Absolute origin of this deployment, never with a trailing slash. */
export function resolveSiteUrl(env: Env): string {
  const explicit = clean(env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return withProtocol(explicit).replace(/\/+$/, '');

  const vercel = clean(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercel) return withProtocol(vercel).replace(/\/+$/, '');

  return LOCAL_FALLBACK;
}

/**
 * Whether an incoming Host header belongs to the event's own domain.
 *
 * Compares the full hostname, never a suffix: `evil-wwconnect.com.br` must not
 * be treated as the event host.
 */
export function isEventHost(host: string | null | undefined, eventHost?: string): boolean {
  const configured = clean(eventHost)?.toLowerCase();
  if (!configured) return false;

  const incoming = clean(host ?? undefined)?.toLowerCase();
  if (!incoming) return false;

  return incoming.replace(/:\d+$/, '') === configured.replace(/:\d+$/, '');
}
