/**
 * Single source of truth for where the Imersao Performance e Longevidade
 * checkout lives.
 *
 * Kiwify checkout for the R$ 97 ticket (product "Imersão Performance e
 * Longevidade", Pix + cartão, created 23/09/2026). Hotmart was the course's
 * default, but the account was still in document review with the event six
 * days away. Every CTA on `/imersao` reads `imersaoCtaHref()`, so swapping
 * platforms is a one-line change here. Setting this back to `null` sends the
 * CTAs to `#ingresso` and turns the page's `noindex` back on.
 */
export const IMERSAO_CHECKOUT_URL: string | null = 'https://pay.kiwify.com.br/GpEp0dI';

export function imersaoCtaHref(): string {
  return IMERSAO_CHECKOUT_URL ?? '#ingresso';
}
