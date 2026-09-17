'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

/**
 * The public nav, and the only reason it is a client component: it has to know
 * which page you are on to say so.
 *
 * "Não é muito bem orientado sobre a navegação" was the note. The platform had
 * four public pages and no way to get from any one of them to any other except
 * the browser's back button — and nothing anywhere told you where you were.
 */
/**
 * A mesma espinha das páginas do funil, porque é o mesmo site.
 *
 * kauaramos.com é servido por dois projetos, e até aqui cada um tinha o seu
 * menu: quem entrava pelo /circle não tinha como chegar ao Protocol, ao Face a
 * Face nem aos guias — só ao que esta plataforma serve. O visitante não sabe
 * que são dois projetos, e não deveria precisar saber.
 *
 * `/wealth-wellness` e `/niva` moram no funil (ver `FUNNEL_ROUTES`). São links
 * normais porque, pelo domínio, são caminhos normais.
 */
const LINKS = [
  { href: '/wealth-wellness', label: 'Wealth & Wellness' },
  { href: '/circle', label: 'Circle' },
  { href: '/circle/artigos', label: 'Artigos' },
  { href: '/niva', label: 'NIVA' },
];

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * O link mais específico que casa com a página. `/circle/artigos/x` casa com
 * `/circle` e com `/circle/artigos`; só o segundo pode acender, senão o menu
 * diz que você está em dois lugares.
 */
function activeHref(pathname: string): string | undefined {
  return LINKS.filter((link) => matches(pathname, link.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function SiteNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const current = activeHref(pathname);

  return (
    <nav className={clsx('flex items-center gap-6', className)} aria-label="Seções">
      {LINKS.map((link) => {
        const active = link.href === current;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'relative whitespace-nowrap py-2 text-[11px] uppercase tracking-[0.2em] transition',
              active
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]',
            )}
          >
            {link.label}
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-px bg-[var(--accent)]"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
