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

/**
 * As vendas do ingresso fecham sozinhas quando o evento começa: quarta,
 * 28/10/2026, às 19h30 (America/Sao_Paulo, -03:00). Depois deste instante
 * `imersaoCtaHref()` para de apontar pro checkout da Kiwify, mesmo com
 * `IMERSAO_CHECKOUT_URL` preenchido.
 */
export const IMERSAO_SALES_CLOSE_AT = new Date('2026-10-28T19:30:00-03:00');

/**
 * Pura: recebe o "agora" como argumento em vez de ler `Date` global direto,
 * pra dar pra testar a borda exata (19:29:59 aberto, 19:30:00 fechado) sem
 * mockar relógio. O padrão (`new Date()`) é o que o app usa de verdade — no
 * servidor a cada render (a página roda com `revalidate = 60`, então o
 * estado troca sozinho, sem novo deploy) e de novo no cliente a cada clique
 * (`ImersaoAnalytics`), pra cobrir o HTML que ainda estiver em cache de antes
 * do fechamento.
 */
export function imersaoSalesOpen(now: Date = new Date()): boolean {
  return now.getTime() < IMERSAO_SALES_CLOSE_AT.getTime();
}

/**
 * Substitui o botão de compra na seção de fechamento (`#ingresso`) depois
 * que as vendas encerram. Sem travessão, sem ponto de exclamação (pedido do
 * Kauã, 24/09).
 */
export const IMERSAO_SALES_CLOSED_MESSAGE =
  'As vendas encerraram. A Imersão começou quarta, 28/10, às 19h30.';

export function imersaoCtaHref(now: Date = new Date()): string {
  if (!IMERSAO_CHECKOUT_URL || !imersaoSalesOpen(now)) return '#ingresso';
  return IMERSAO_CHECKOUT_URL;
}

/**
 * The event's WhatsApp group, where the buyer lands from `/imersao/obrigado`
 * (Kiwify's thank-you URL points at that page, not straight here). The
 * Purchase itself is sent server-side from the Kiwify webhook.
 */
export const IMERSAO_GRUPO_WHATSAPP_URL = 'https://chat.whatsapp.com/I838Hk7bi460qBLRTINvYX';
