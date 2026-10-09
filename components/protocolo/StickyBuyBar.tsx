'use client';

import { useEffect, useState } from 'react';
import {
  WHATSAPP_MESSAGE_CONVERSAR,
  protocoloCtaHref,
  stickyBarTextoDesktop,
  stickyBarTextoMobile,
  whatsappHref,
} from '@/lib/protocolo';
import { useConsentDecision } from '@/lib/analytics/consent';

/**
 * The fixed buy bar (S20, mobile and desktop) for `/imersao/protocolo`, same contract as
 * `components/imersao/StickyBuyBar.tsx`: it hides while the hero CTA is
 * still on screen (a second CTA there would be a duplicate, not a
 * reinforcement), hides again once the closing offer section (`#oferta`)
 * comes into view, and hides while the Meta Pixel consent banner is up, so
 * the phone's bottom edge never has two fixed elements fighting for the
 * same strip.
 *
 * The button always points at the 180-day plan, the primary CTA everywhere
 * on this page; on desktop the S20 "Conversar antes" WhatsApp link sits next
 * to it. The 90-day plan lives in the sections that offer it explicitly.
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
      className={`fixed inset-x-0 bottom-0 z-50 flex min-h-[64px] items-center justify-between gap-4 border-t border-[rgba(244,242,238,0.12)] bg-[#0D0D0D]/95 px-4 backdrop-blur-sm transition-transform duration-300 md:min-h-[72px] md:px-10 lg:px-16 ${
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <p className="text-[0.8125rem] leading-[1.3] font-medium text-[#F4F2EE] md:text-[0.9375rem]">
        <span className="md:hidden">{stickyBarTextoMobile()}</span>
        <span className="hidden md:inline">{stickyBarTextoDesktop()}</span>
      </p>
      <div className="flex shrink-0 items-center gap-5">
        <a
          href={whatsappHref(WHATSAPP_MESSAGE_CONVERSAR)}
          data-cta="sticky-whatsapp"
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={visible ? 0 : -1}
          className="hidden min-h-[44px] items-center text-[0.9375rem] text-[#F4F2EE] underline underline-offset-4 hover:text-[#C9A84C] md:inline-flex"
        >
          Conversar antes
        </a>
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
      </div>
    </nav>
  );
}
