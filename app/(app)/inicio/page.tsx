import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/core/format.core';

export const metadata: Metadata = {
  title: 'Início',
  robots: { index: false, follow: false },
};

const PRODUCTS: Record<string, { name: string; blurb: string }> = {
  protocol: {
    name: 'W&W Protocol',
    blurb: 'Acompanhamento individual. A Library fica sua para sempre.',
  },
  circle: { name: 'W&W Circle', blurb: 'Encontro ao vivo toda quinta e a Library liberada.' },
  connect: { name: 'W&W Connect', blurb: 'Convidado do evento.' },
  face_a_face: { name: 'Face a Face', blurb: 'Sessão avulsa.' },
};

function firstName(full: string | null | undefined, email: string | undefined): string {
  const name = full?.trim().split(/\s+/)[0];
  return name || email?.split('@')[0] || 'por aqui';
}

export default async function InicioPage() {
  const user = await requireUser();
  const supabase = await serverClient();

  // Read as the person, not around them: the policy returns their own rows and
  // nothing else, so there is no ownership check here to get wrong.
  const [{ data: profile }, { data: entitlements }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase
      .from('entitlements')
      .select('product, status, expires_at')
      .in('status', ['active', 'past_due'])
      .order('product'),
  ]);

  const live = (entitlements ?? []).filter(
    (row) => row.expires_at === null || new Date(row.expires_at) > new Date(),
  );

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">Sua área</p>
      <h1 className="mt-4 text-4xl">Olá, {firstName(profile?.full_name, user.email)}.</h1>

      {live.length > 0 ? (
        <ul className="mt-10 flex flex-col gap-px overflow-hidden border border-[var(--border)]">
          {live.map((row) => {
            const product = PRODUCTS[row.product] ?? { name: row.product, blurb: '' };
            return (
              <li key={row.product} className="bg-[var(--bg-card)] px-6 py-5">
                <p className="text-lg text-[var(--text-1)]">{product.name}</p>
                <p className="mt-1 text-sm text-[var(--text-2)]">{product.blurb}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--text-4)]">
                  {row.expires_at
                    ? `Vale até ${formatDate(row.expires_at)}`
                    : 'Acesso vitalício'}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-10 border border-[var(--border)] bg-[var(--bg-card)] px-6 py-8">
          <p className="text-[var(--text-1)]">Ainda não há nenhum acesso ligado a este e-mail.</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-2)]">
            Se você já comprou, provavelmente pagou com outro endereço.{' '}
            <Link
              href="/sem-acesso"
              className="text-[var(--accent)] underline underline-offset-4"
            >
              Me avise aqui
            </Link>{' '}
            que eu ligo os dois.
          </p>
        </div>
      )}
    </div>
  );
}
