import type { Metadata } from 'next';
import Link from 'next/link';
import { Band } from '@/components/ui/Band';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { requireUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { LEGAL, pending } from '@/lib/legal';
import { formatDate } from '@/lib/core/format.core';

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
  const fmt = (iso: string | null) => formatDate(iso) || null;

  return (
    <div className="flex flex-col gap-14 md:gap-20">
      <div>
        <SectionHeading eyebrow="Sua conta" title={profile?.full_name || user.email} />
        <div className="rule-gold mt-7" aria-hidden="true" />
      </div>

      <Band
        eyebrow="Dados"
        title="O que guardamos."
        lede="Recebemos do Google apenas nome, e-mail e foto de perfil. Nunca sua senha, nem acesso a Gmail, Drive, Agenda ou contatos."
      >
        <dl className="flex flex-col gap-px overflow-hidden border border-[var(--border)]">
          <Row label="E-mail" value={profile?.email ?? user.email ?? 'não informado'} />
          <Row label="Nome" value={profile?.full_name ?? 'não informado'} />
          <Row
            label="Entrou pela primeira vez"
            value={fmt(profile?.created_at ?? null) ?? 'não informado'}
          />
          <Row label="Forma de entrada" value="Conta Google" />
        </dl>
      </Band>

      <Band
        eyebrow="Acessos"
        title="O que está ligado a este e-mail."
        lede="Vitalício não expira. O resto mostra a data em que termina, e continua valendo até lá."
      >
        {(entitlements ?? []).length === 0 ? (
          <p className="prose-body">
            Nenhum acesso ligado a este e-mail.{' '}
            <Link href="/sem-acesso" className="link-draw text-[var(--accent)]">
              Comprou e não apareceu?
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-px overflow-hidden border border-[var(--border)]">
            {(entitlements ?? []).map((row, i) => {
              const expired = row.expires_at && new Date(row.expires_at) <= new Date();
              const live = !expired && ['active', 'past_due'].includes(row.status);

              return (
                <li key={i} className="bg-[var(--bg-card)] px-6 py-5">
                  <p className="card-title">{PRODUCT_LABEL[row.product] ?? row.product}</p>
                  <p className="meta mt-2">
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
      </Band>

      <Band
        eyebrow="LGPD"
        title="Seus direitos."
        lede="Correção, portabilidade ou exclusão da conta a qualquer momento, sem custo e sem justificar."
      >
        <p className="prose-body">
          Escreva para <strong className="text-[var(--text-1)]">{contact}</strong>.
          Respondemos em até 15 dias.
        </p>
        <p className="mt-4 text-xs leading-relaxed text-[var(--text-4)]">
          Registros de compra ficam pelo prazo que a lei fiscal exige mesmo depois da conta
          encerrada, porque são prova de uma relação que existiu. O resto é apagado ou
          anonimizado. Detalhes na{' '}
          <Link href="/privacidade" className="link-draw">
            Política de Privacidade
          </Link>
          .
        </p>

        <form action="/api/auth/sair" method="post" className="mt-10">
          <button
            type="submit"
            className="border border-[var(--border)] px-6 py-3 text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
          >
            Sair desta conta
          </button>
        </form>
      </Band>
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
