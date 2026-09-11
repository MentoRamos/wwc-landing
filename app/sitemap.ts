import type { MetadataRoute } from 'next';
import { resolveSiteUrl } from '@/lib/core/site.core';

/**
 * The public pages, and only those.
 *
 * Everything behind the login is deliberately absent — it is already
 * disallowed in robots.txt, and listing it here would be the one file
 * cheerfully handing a crawler the map robots just told it to ignore.
 *
 * Built against NEXT_PUBLIC_SITE_URL rather than the requesting host, which
 * keeps this a static file. When the event's own domain exists it will need
 * its own answer here and its own canonical — see the note in the session
 * handover; that is a decision about whether the event domain should rank on
 * its own, not something to guess at now.
 */
const PUBLIC_PAGES = [
  { path: '/', priority: 1 },
  { path: '/connect', priority: 0.9 },
  { path: '/circle', priority: 0.9 },
  { path: '/circle/termos', priority: 0.3 },
  { path: '/privacidade', priority: 0.2 },
  { path: '/termos', priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  }).replace(/\/+$/, '');
  const lastModified = new Date();

  return PUBLIC_PAGES.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified,
    priority,
  }));
}
