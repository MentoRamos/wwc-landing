'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const LINKS = [
  { href: '/inicio', label: 'Início' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/circle', label: 'Circle' },
  { href: '/conta', label: 'Conta' },
];

/** The desktop half of the same four places the tab bar covers on a phone. */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'relative py-2 text-[11px] uppercase tracking-[0.2em] transition',
              active ? 'text-[var(--accent)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]',
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
