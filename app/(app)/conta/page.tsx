import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { LEGAL, pending } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Sua conta',
  robots: { index: false, follow: false },
};

const PRODUCT_LABEL: Record<string, string> = {
  protocol: 'W&W Protocol',
  circle: 'W&W Circle',
  connect: 'W&W Connect',
  face_a_face: 'Face a Face',
};

/**
 * What we hold about somebody, shown to them without them having to ask.
 *
 * The LGPD gives a person the right to confirm that processing exists and to
 * see what is held (art. 18, I and II). A page that simply shows it satisfies
 * the commonest version of that request before it is made, and makes the
 * deletion route visible rather than buried — which is the difference between
 * honouring the right and technically offering it.
 */
export default async function ContaPage() {
  const user = await requireUser();
  const supabase = await serverClient();

  const [{ data: profile }, { data: entitlements }] = await Promise.all([
    supabase.from('profiles').select('full_name, email, created_at').eq('id', user.id).maybeSingle(),
    supabase
      .from('entitlements')
      .select('product, status, source, starts_at, expires_at')
      .order('created_at', { ascending: false }),
  ]);

  const contact = pending(LEGAL.contactEmail, 'e-mail de contato');
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR') : null;

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">Sua conta</p>
      <h1 className="mt-4 text-4xl">{profile?.full_name || user.email}</h1>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">
          O que guardamos
        </h2>
        <dl className="mt-5 flex flex-col gap-px overflow-hidden border border-[var(--border)]">
          <Row label="E-mail" value={profile?.email ?? user.email ?? '—'} />
          <Row label="Nome" value={profile?.full_name ?? '—'} />
          <Row label="Entrou pela primeira vez" value={fmt(profile?.created_at ?? null) ?? '—'} />
          <Row label="Forma de entrada" value="Conta Google" />
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-[var(--text-4)]">
          Recebemos do Google apenas nome, e-mail e foto de perfil. Nunca sua senha, nem
          acesso a Gmail, Drive, Agenda ou contatos.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">Seus acessos</h2>

        {(entitlements ?? []).length === 0 ? (
          <p className="mt-5 text-sm leading-relaxed text-[var(--text-2)]">
            Nenhum acesso ligado a este e-mail.{' '}
            <Link href="/sem-acesso" className="text-[var(--accent)] underline underline-offset-4">
              Comprou e não apareceu?
            </Link>
          </p>
        ) : (
          <ul className="mt-5 flex flex-col gap-px overflow-hidden border border-[var(--border)]">
            {(entitlements ?? []).map((row, i) => {
              const expired = row.expires_at && new Date(row.expires_at) <= new Date();
              const live = !expired && ['active', 'past_due'].includes(row.status);

              return (
                <li key={i} className="bg-[var(--bg-card)] px-6 py-4">
                  <p className="text-sm text-[var(--text-1)]">
                    {PRODUCT_LABEL[row.product] ?? row.product}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-3)]">
                    {live
                      ? row.expires_at
                        ? `Vale até ${fmt(row.expires_at)}`
                        : 'Acesso vitalício'
                      : expired
                        ? `Encerrado em ${fmt(row.expires_at)}`
                        : 'Encerrado'}
                    {' · '}
                    {row.source === 'manual' ? 'liberado na mão' : row.source}
                    {row.starts_at && ` · desde ${fmt(row.starts_at)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">Seus direitos</h2>
        <p className="mt-5 text-sm leading-relaxed text-[var(--text-2)]">
          Você pode pedir correção, portabilidade ou a exclusão da conta a qualquer momento,
          sem custo e sem justificar. Escreva para{' '}
          <strong className="text-[var(--text-1)]">{contact}</strong> — respondemos em até 15
          dias.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-[var(--text-4)]">
          Registros de compra ficam pelo prazo que a lei fiscal exige mesmo depois da conta
          encerrada, porque são prova de uma relação que existiu. O resto é apagado ou
          anonimizado. Detalhes na{' '}
          <Link href="/privacidade" className="underline underline-offset-4">
            Política de Privacidade
          </Link>
          .
        </p>
      </section>

      <form action="/api/auth/sair" method="post" className="mt-12">
        <button
          type="submit"
          className="border border-[var(--border)] px-6 py-3 text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
        >
          Sair desta conta
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 bg-[var(--bg-card)] px-6 py-4">
      <dt className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)]">{label}</dt>
      <dd className="text-sm text-[var(--text-1)]">{value}</dd>
    </div>
  );
}
