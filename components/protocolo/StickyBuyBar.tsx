'use client';

import { useEffect, useState } from 'react';
import { protocoloCtaHref, stickyBarTextoMobile } from '@/lib/protocolo';
import { useConsentDecision } from '@/lib/analytics/consent';

/**
 * The mobile fixed buy bar for `/imersao/protocolo`, same contract as
 * `components/imersao/StickyBuyBar.tsx`: it hides while the hero CTA is
 * still on screen (a second CTA there would be a duplicate, not a
 * reinforcement), hides again once the closing offer section (`#oferta`)
 * comes into view, and hides while the Meta Pixel consent banner is up, so
 * the phone's bottom edge never has two fixed elements fighting for the
 * same strip.
 *
 * Always points at the 180-day plan: the primary CTA everywhere on this
 * page. Whoever wants the 90-day plan or to talk first scrolls to the
 * sections that offer those paths explicitly.
 */
export function ProtocoloStickyBuyBar() {
  const [heroVisible, setHeroVisible] = useState(true);
  const [closingVisible, setClosingVisible] = useState(false);
  const consentBannerVisible = useConsentDecision() === 'ask';

  const cta = protocoloCtaHref('180d');

  useEffect(() => {
    const hero = document.querySelector('[data-cta="hero"]');
    const closing = document.getElementById('oferta');
    if (!hero || !closing) return;

    const heroObserver = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), {
      threshold: 0,
    });
    const closingObserver = new IntersectionObserver(([entry]) => setClosingVisible(entry.isIntersecting), {
      threshold: 0,
    });

    heroObserver.observe(hero);
    closingObserver.observe(closing);

    return () => {
      heroObserver.disconnect();
      closingObserver.disconnect();
    };
  }, []);

  const visible = !heroVisible && !closingVisible && !consentBannerVisible;

  return (
    <nav
      aria-label="Compra rápida do W&W Protocol"
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-50 flex min-h-[64px] items-center justify-between gap-4 border-t border-[rgba(244,242,238,0.12)] bg-[#0D0D0D]/95 px-4 backdrop-blur-sm transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <p className="text-[0.8125rem] leading-[1.3] font-medium text-[#F4F2EE]">{stickyBarTextoMobile()}</p>
      <a
        href={cta}
        data-cta="sticky"
        data-plan="180d"
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={visible ? 0 : -1}
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-[#C9A84C] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[#0D0D0D] transition-colors duration-300 hover:bg-[#D4B85C]"
      >
        QUERO O PROTOCOL
      </a>
    </nav>
  );
}
