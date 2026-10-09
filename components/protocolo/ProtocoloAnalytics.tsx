'use client';

import { useEffect, useRef } from 'react';
import { PROTOCOLO_CHECKOUT_URL_180D, PROTOCOLO_CHECKOUT_URL_90D } from '@/lib/protocolo';
import { mergeCheckoutUtm } from '@/lib/analytics/utm';
import { queueOrSendEvent } from '@/lib/analytics/meta-pixel';

const SCROLL_THRESHOLDS = [25, 50, 75, 100];
const OFFER_NAME = 'W&W Protocol';

/**
 * Same idiom as `components/imersao/ImersaoAnalytics.tsx`: one listener for
 * the whole page, event delegation on `a[data-cta]` instead of a handler
 * wired into every button, and events routed through `queueOrSendEvent` so
 * nothing fires before Meta Pixel consent (`components/MetaPixel.tsx`)
 * resolves.
 *
 * Unlike `/imersao`, there is no single ticket price to report: this page
 * sells two plans (`data-plan="180d"` or `"90d"`), so `InitiateCheckout`
 * carries the plan instead of a `value`. No price is read from the page
 * copy itself, which never shows one.
 */
export function ProtocoloAnalytics() {
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

      const plan = link.dataset.plan;
      if (plan === '180d' || plan === '90d') {
        queueOrSendEvent('InitiateCheckout', {
          content_name: OFFER_NAME,
          plan,
        });

        // Forwards the visit's own utm_*/src/sck onto the Kiwify checkout, the
        // same hop `/imersao` covers in its own analytics component — the
        // checkout lives on a different domain, so nothing carries that
        // attribution across unless it is copied here.
        const checkoutUrl = plan === '180d' ? PROTOCOLO_CHECKOUT_URL_180D : PROTOCOLO_CHECKOUT_URL_90D;
        link.href = mergeCheckoutUtm(checkoutUrl, window.location.href);
      } else {
        queueOrSendEvent('Contact', { content_name: OFFER_NAME });
      }
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
