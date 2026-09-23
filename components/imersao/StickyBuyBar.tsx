'use client';

import { useEffect, useState } from 'react';
import { isExternalLink } from '@/lib/core/links.core';
import { imersaoCtaHref } from '@/lib/imersao';
import { useConsentDecision } from '@/lib/analytics/consent';

/**
 * A barra fixa de compra do celular, o único motivo justificado de
 * `'use client'` que o design original da página previa: nada aqui muda o
 * conteúdo, só decide quando um segundo CTA aparece por cima dele, e isso só
 * dá pra saber olhando pra viewport.
 *
 * Ela some duas vezes por dois motivos diferentes: enquanto o CTA do herói
 * ainda está visível (mostrar a barra ali seria CTA duplicado, não reforço),
 * e de novo quando a seção de fechamento (`#ingresso`) entra na tela (o
 * mesmo motivo, invertido — a página já está mostrando o card de compra
 * final). Ela também some enquanto o banner de consentimento do pixel está
 * no ar, pro rodapé do celular nunca ter dois elementos fixos brigando pelo
 * mesmo espaço.
 */
export function StickyBuyBar() {
  const [heroVisible, setHeroVisible] = useState(true);
  const [closingVisible, setClosingVisible] = useState(false);
  const consentBannerVisible = useConsentDecision() === 'ask';

  const cta = imersaoCtaHref();
  const external = isExternalLink(cta);

  useEffect(() => {
    const hero = document.querySelector('[data-cta="hero"]');
    const closing = document.getElementById('ingresso');
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
      aria-label="Compra rápida do ingresso"
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-50 flex min-h-[64px] items-center justify-between gap-4 border-t border-[rgba(244,242,238,0.12)] bg-[#0D0D0D]/95 px-4 backdrop-blur-sm transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <p className="text-[0.9375rem] font-medium text-[#F4F2EE]">Ingresso R$ 97</p>
      <a
        href={cta}
        data-cta="sticky"
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        tabIndex={visible ? 0 : -1}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#C9A84C] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[#0D0D0D] transition-colors duration-300 hover:bg-[#D4B85C]"
      >
        GARANTIR MEU INGRESSO
      </a>
    </nav>
  );
}
