import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { AppNav } from '@/components/layout/AppNav';
import { AppTabBar } from '@/components/layout/AppTabBar';
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
          <Link href="/inicio" className="flex shrink-0 items-center gap-3">
            <Logo size={44} />
            <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-[var(--text-2)] sm:text-xs sm:tracking-[0.18em]">
              Wealth &amp; Wellness
            </span>
          </Link>

          <AppNav />

          <form action="/api/auth/sair" method="post" className="flex items-center gap-4">
            <span className="hidden text-xs text-[var(--text-4)] lg:inline">{user.email}</span>
            <button
              type="submit"
              className="min-h-11 px-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* The bottom bar is fixed, so the last card on the page needs room to
          clear it — otherwise it is permanently half-covered on a phone. */}
      <div className="container-lp pb-28 pt-12 md:pb-16">{children}</div>

      <AppTabBar />
    </div>
  );
}
