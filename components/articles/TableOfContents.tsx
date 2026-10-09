'use client';

import { useEffect, useState } from 'react';

/**
 * "Neste artigo": o sumário da coluna esquerda no desktop.
 *
 * Marca a seção em que o leitor está e mostra quanto do artigo já passou.
 * É o que transforma a lateral vazia da tela grande em navegação: num artigo
 * de 1.200 palavras, saber onde se está e pular direto para "Na prática" é o
 * que a leitura no celular não precisa e a do desktop agradece.
 */
export function TableOfContents({ headings }: { headings: Array<{ id: string; text: string }> }) {
  const [active, setActive] = useState<string | undefined>(headings[0]?.id);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const body = document.getElementById('corpo-do-artigo');
      if (body) {
        const rect = body.getBoundingClientRect();
        const read = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - rect.top) / rect.height));
        setProgress(Math.round(read * 100));
      }
      let current = headings[0]?.id;
      for (const heading of headings) {
        const el = document.getElementById(heading.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) current = heading.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Neste artigo">
      <p className="eyebrow">Neste artigo</p>
      <div className="mt-4 h-px w-full bg-[var(--border)]">
        <div className="h-px bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <ol className="mt-5 flex flex-col gap-1">
        {headings.map((heading) => {
          const isActive = heading.id === active;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={`block border-l py-1.5 pl-4 text-[13px] leading-snug transition ${
                  isActive
                    ? 'border-[var(--accent)] text-[var(--text-1)]'
                    : 'border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
