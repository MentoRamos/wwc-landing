'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}

/**
 * O conteúdo aparece ao rolar, mas existe mesmo se o JavaScript nunca rodar.
 *
 * Isto usava Framer Motion com `initial={{ opacity: 0 }}`. O Framer serializa
 * esse estado no HTML do servidor, e o resultado era que a página do evento
 * saía com 236 elementos invisíveis: em 4G ruim ela ficava branca até hidratar,
 * e com JavaScript desligado ficava branca para sempre. Uma página de venda que
 * depende de JS para ter texto é uma página que às vezes não tem texto.
 *
 * A inversão é o ponto: o estado de repouso é visível, e o escondido é opt-in.
 * Sem JS, nada arma, e a página inteira está lá.
 *
 * O `getBoundingClientRect` antes de armar resolve o outro lado da moeda. Se
 * armássemos tudo no mount, o que já estava na tela apareceria e sumiria antes
 * de reaparecer — pior que o defeito original. Só entra na animação o que está
 * abaixo da dobra, que é justamente o que a animação existe para acompanhar.
 * O que já estava à vista simplesmente fica.
 */
export function ScrollReveal({ children, delay = 0, className = '', y = 40 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Já visível quando a página abriu: não esconde, não anima, não pisca.
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    element.dataset.armed = 'true';

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          element.classList.add('is-in');
          observer.disconnect();
        }
      },
      { rootMargin: '-80px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={
        {
          '--reveal-y': `${y}px`,
          '--reveal-delay': `${delay}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
