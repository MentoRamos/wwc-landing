/**
 * Forwards the visitor's own attribution params from the page URL onto the
 * checkout URL, once IMERSAO_CHECKOUT_URL stops being null.
 *
 * Without this, every sale would look organic in Hotmart no matter which ad
 * paid for the click: the checkout lives on a different domain, so nothing
 * carries `utm_*` or Hotmart's own `src`/`sck` across that hop unless we do
 * it by hand.
 */
const FORWARDED_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];

export function mergeCheckoutUtm(checkoutUrl: string, pageUrl: string): string {
  let source: URL;
  let target: URL;
  try {
    source = new URL(pageUrl);
    target = new URL(checkoutUrl);
  } catch {
    return checkoutUrl;
  }

  for (const key of FORWARDED_PARAMS) {
    const value = source.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }

  return target.toString();
}
