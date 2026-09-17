import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { robotsFor } from '@/lib/core/host-routing.core';

/**
 * robots.txt, decided per host.
 *
 * Reading `headers()` is what makes this a request-time route instead of a
 * file baked at build — and that is the whole point. One deployment answers on
 * the canonical domain, on the event's own domain, and on a fresh
 * `*.vercel.app` for every push. Only the last of those needs shutting out,
 * but it needs it badly: a preview left open puts a full copy of the site in
 * the index for every branch.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const store = await headers();
  const plan = robotsFor(store.get('x-forwarded-host') ?? store.get('host'));

  return {
    rules: [
      {
        userAgent: '*',
        ...(plan.allow.length > 0 ? { allow: plan.allow } : {}),
        disallow: plan.disallow,
      },
    ],
  };
}
