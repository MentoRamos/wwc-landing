'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

/**
 * The bottom bar, on phones only.
 *
 * Kauã's note after opening the platform on his iPhone was that he could not
 * find anything: the signed-in area had two links, both in a header he had to
 * scroll back up to reach. On a phone the thumb lives at the bottom of the
 * screen, so the four places a member ever goes live there too, always
 * visible, always saying which one they are on.
 *
 * `pb-[env(safe-area-inset-bottom)]` is not decoration — without it the row
 * sits under the iPhone's home indicator and the last few pixels of every tap
 * go to the system, not to us.
 */
const TABS = [
  {
    href: '/inicio',
    label: 'Início',
    path: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  },
  {
    href: '/biblioteca',
    label: 'Biblioteca',
    path: 'M4 4.5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 4.5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z',
  },
  {
    href: '/circle',
    label: 'Circle',
    path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v4l2.5 2.5',
  },
  {
    href: '/conta',
    label: 'Conta',
    path: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  },
];

/**
 * A quinta aba, pela mesma regra da `AppSidebar`: ela só existe para quem tem
 * documento do aluno.
 *
 * Sem ela, o acompanhamento era a única coisa da plataforma sem endereço no
 * telefone. Quem só tem o Circle continua vendo quatro abas, porque uma aba
 * que leva a uma página vazia promete o que a pessoa não comprou.
 */
const ACOMPANHAMENTO = {
  href: '/aluno',
  label: 'Você',
  path: 'M6 3.5h7l5 5V20.5H6zM13 3.5V9h5M9 13h6M9 16.5h4',
};

export function AppTabBar({ hasDocuments = false }: { hasDocuments?: boolean }) {
  const pathname = usePathname();
  const tabs = hasDocuments ? [...TABS, ACOMPANHAMENTO] : TABS;

  return (
    <nav
      aria-label="Navegação"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 transition',
                  active ? 'text-[var(--accent)]' : 'text-[var(--text-3)]',
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d={tab.path} />
                </svg>
                <span className="text-[10px] uppercase tracking-[0.12em]">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
