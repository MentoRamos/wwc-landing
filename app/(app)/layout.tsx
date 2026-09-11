import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { requireUser } from '@/lib/auth/guard';

/**
 * Everything under here needs somebody signed in.
 *
 * The guard answers "is anyone there", and only that. Whether that person may
 * see a given replay or report is decided by the query that fetches it, where
 * RLS returns nothing at all if they may not — so a page added to this group
 * later cannot forget a check that does not live here.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
        <div className="container-lp flex h-16 items-center justify-between gap-4">
          <Link href="/inicio" className="flex items-center gap-3">
            <Logo size={32} />
            <span className="text-sm tracking-[0.14em] uppercase text-[var(--text-2)]">
              Wealth &amp; Wellness
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-6">
            <Link
              href="/biblioteca"
              className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
            >
              Biblioteca
            </Link>
            <Link
              href="/conta"
              className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
            >
              Conta
            </Link>
          </nav>

          <form action="/api/auth/sair" method="post" className="flex items-center gap-4">
            <span className="hidden text-xs text-[var(--text-4)] sm:inline">{user.email}</span>
            <button
              type="submit"
              className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="container-lp py-12">{children}</div>
    </div>
  );
}
