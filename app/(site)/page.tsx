import { redirect } from 'next/navigation';

/**
 * Placeholder root.
 *
 * The platform hub lives here once it exists. Until then the only finished
 * public page is the event, so the root sends visitors there. On the event's
 * own domain this redirect is replaced by a host rewrite in `proxy.ts`, so the
 * address bar keeps showing the event domain's root.
 */
export default function Root() {
  redirect('/connect');
}
