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

const ACOMPANHAMENTO = { href: '/aluno', label: 'Acompanhamento' };

/**
 * The desktop half of the same four places the tab bar covers on a phone, mais
 * um quinto que só existe para quem tem o que ver nele.
 *
 * `/aluno` aparece só quando há documento do aluno. Um item de navegação que
 * leva a uma página vazia é pior que item nenhum: ele promete uma coisa que a
 * pessoa não comprou, e faz o assinante do Circle achar que está faltando
 * algo dele. Quem decide é o layout, que já leu o banco.
 */
export function AppNav({ hasDocuments = false }: { hasDocuments?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação">
      {(hasDocuments ? [...LINKS, ACOMPANHAMENTO] : LINKS).map((link) => {
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
