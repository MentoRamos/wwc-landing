'use client';

import { useEffect, useRef } from 'react';
import { IMERSAO_CHECKOUT_URL, imersaoSalesOpen } from '@/lib/imersao';
import { mergeCheckoutUtm } from '@/lib/analytics/utm';
import { queueOrSendEvent } from '@/lib/analytics/meta-pixel';

const SCROLL_THRESHOLDS = [25, 50, 75, 100];
const TICKET_PRICE_BRL = 97;
const EVENT_NAME = 'Imersão Performance e Longevidade';

/**
 * O único listener de clique/scroll da página, pra não precisar virar
 * `app/imersao/page.tsx` inteira num Client Component só por causa de
 * tracking. Delegação de evento em vez de um handler por âncora: qualquer
 * `<a data-cta>` da página (incluindo o da StickyBuyBar) já é coberto sem
 * precisar de mais uma prop passada adiante.
 *
 * Os eventos passam por `queueOrSendEvent`, não por `window.fbq` direto: até
 * o consentimento chegar (ou for recusado), eles ficam em memória — nunca
 * saem sem permissão, e nunca travam a interação de quem clicou.
 */
export function ImersaoAnalytics() {
  const firedThresholds = useRef(new Set<number>());

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const percent = scrollable <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / scrollable) * 100));

      for (const threshold of SCROLL_THRESHOLDS) {
        if (percent >= threshold && !firedThresholds.current.has(threshold)) {
          firedThresholds.current.add(threshold);
          queueOrSendEvent('ScrollDepth', { percent: threshold }, true);
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[data-cta]');
      if (!link) return;

      // Reavalia com o relógio do cliente, não com o horário em que o HTML
      // foi gerado: a página roda em ISR (`revalidate = 60`, ver
      // `app/imersao/page.tsx`) e pode servir, por até um minuto, uma versão
      // renderizada antes do fechamento das vendas — com o `href` real da
      // Kiwify já embutido no HTML em cache. Se pro relógio de quem clicou as
      // vendas já fecharam, barra a navegação aqui, antes de sequer chegar
      // no rewrite de UTM abaixo.
      if (!imersaoSalesOpen()) {
        event.preventDefault();
        return;
      }

      queueOrSendEvent('InitiateCheckout', {
        value: TICKET_PRICE_BRL,
        currency: 'BRL',
        content_name: EVENT_NAME,
      });

      // Só passa a existir depois que o checkout real for cadastrado em
      // lib/imersao.ts; até lá todo CTA é `#ingresso` e não há pra onde
      // encaminhar utm/sck. O visitante continua indo pro mesmo destino que
      // já estava no `href` — este passo só acrescenta os parâmetros de
      // origem da própria visita (utm_*, src, sck) que o clique já carrega
      // na URL da página, pro checkout saber de qual anúncio a venda veio.
      if (IMERSAO_CHECKOUT_URL) {
        link.href = mergeCheckoutUtm(IMERSAO_CHECKOUT_URL, window.location.href);
      }
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
