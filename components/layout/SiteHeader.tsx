import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { SiteNav } from '@/components/layout/SiteNav';

/**
 * The same header on every public page of the platform.
 *
 * The event keeps its own — it navigates by anchor into one long page, which
 * is a different job. Everything else shares this one, so the way back is
 * always in the same corner.
 */
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
      <div className="container-lp flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Logo size={40} />
          <span className="hidden text-xs uppercase tracking-[0.18em] text-[var(--text-2)] sm:inline">
            Wealth &amp; Wellness
          </span>
        </Link>

        <SiteNav className="hidden md:flex" />

        <Link
          href={signedIn ? '/inicio' : '/entrar'}
          className="shrink-0 whitespace-nowrap border border-[var(--border)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-2)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
        >
          {signedIn ? 'Sua área' : 'Entrar'}
        </Link>
      </div>

      {/* On a phone the nav gets its own line rather than disappearing behind a
          hamburger: three links do not earn a menu, and a link you can see is
          a link you use. A signed-in member already has the bottom tab bar, so
          for them this second row would be the same nav twice on a 390px
          screen. */}
      {!signedIn && (
        <div className="border-t border-[var(--border)] md:hidden">
          <div className="container-lp">
            <SiteNav className="gap-7 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" />
          </div>
        </div>
      )}
    </header>
  );
}
