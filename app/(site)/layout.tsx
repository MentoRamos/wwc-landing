import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { AppTabBar } from '@/components/layout/AppTabBar';
import { currentUser } from '@/lib/auth/guard';

/**
 * The public shell.
 *
 * `currentUser()` here only decides whether the corner says "Entrar" or "Sua
 * área" — it grants nothing and guards nothing. Every page under this group is
 * public by design, and what a signed-in person may actually see is still
 * decided by the query that fetches it.
 *
 * The event lives in its own group because its header navigates by anchor
 * into one long page and its footer is the event's, not the platform's.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader signedIn={Boolean(user)} />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
      {user && <div aria-hidden="true" className="h-16 md:hidden" />}
      {user && <AppTabBar />}
    </div>
  );
}
