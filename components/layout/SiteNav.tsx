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
const LINKS = [
  { href: '/connect', label: 'Connect' },
  { href: '/circle', label: 'Circle' },
  { href: '/biblioteca', label: 'Biblioteca' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={clsx('flex items-center gap-6', className)} aria-label="Seções">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
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
