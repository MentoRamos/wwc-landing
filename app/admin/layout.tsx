import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { requireAdmin } from '@/lib/auth/guard';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * Everything under `/admin` is admin-only, and a non-admin gets a 404 rather
 * than a redirect — see `requireAdmin`.
 *
 * This layout is the convenience, not the defence: the Server Actions each
 * check for themselves, because a form action is a POST endpoint that does
 * not care which layout rendered the button.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
        <div className="container-lp flex h-16 items-center justify-between gap-4">
          <Link href="/admin/acessos" className="flex items-center gap-3">
            <Logo size={40} />
            <span className="text-sm uppercase tracking-[0.14em] text-[var(--text-2)]">
              Admin
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/admin/acessos"
              className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
            >
              Acessos
            </Link>
            <Link
              href="/admin/interesse"
              className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
            >
              Interesse
            </Link>
            <Link
              href="/inicio"
              className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
            >
              Sair do admin
            </Link>
            <span className="hidden text-xs text-[var(--text-4)] sm:inline">{user.email}</span>
          </div>
        </div>
      </header>

      <div className="container-lp py-12">{children}</div>
    </div>
  );
}
