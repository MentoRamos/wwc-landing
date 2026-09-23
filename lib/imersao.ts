/**
 * Single source of truth for where the Imersao Performance e Longevidade
 * checkout lives.
 *
 * The Hotmart product does not exist yet, so this is `null` on purpose.
 * Every CTA on `/imersao` reads `imersaoCtaHref()` instead of a hardcoded
 * URL, so wiring up the real checkout later is a one-line change here
 * instead of a page-wide find-and-replace. While it is `null`, the CTA
 * points at `#ingresso` (the id of the closing section) so a click never
 * 404s, and the page sets `robots: { index: false, follow: false }` so a
 * crawler does not index a page that cannot yet sell anything.
 */
export const IMERSAO_CHECKOUT_URL: string | null = null;

export function imersaoCtaHref(): string {
  return IMERSAO_CHECKOUT_URL ?? '#ingresso';
}
