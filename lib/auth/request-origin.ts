import type { NextRequest } from 'next/server';
import { resolveCallbackOrigin } from '@/lib/core/auth.core';
import { resolveSiteUrl } from '@/lib/core/site.core';
import { eventHost } from '@/lib/supabase/env';

/**
 * The origin to build a redirect against, from inside a route handler.
 *
 * `request.url` is the URL this deployment was called on, which is not the URL
 * the person is looking at: the platform is reached through a rewrite from the
 * static site. Redirecting to the wrong one drops someone on a domain where
 * their session cookie does not exist.
 */
export function originOf(request: NextRequest): string {
  return resolveCallbackOrigin({
    requestOrigin: new URL(request.url).origin,
    forwardedHost: request.headers.get('x-forwarded-host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    allowedHosts: allowedHosts(),
  });
}

/** Hostnames this deployment is legitimately reached as. */
function allowedHosts(): string[] {
  const site = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });

  const hosts = [new URL(site).host];
  const event = eventHost();
  if (event) hosts.push(event.replace(/^https?:\/\//i, ''));
  return hosts;
}
