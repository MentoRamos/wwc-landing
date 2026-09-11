import type { Metadata } from 'next';
import Link from 'next/link';
import { currentUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { CIRCLE_PLANS, checkoutUrl, nextMeeting, priceLabel } from '@/lib/core/circle.core';
import { formatDateTime } from '@/lib/core/format.core';

export const metadata: Metadata = {
  title: 'W&W Circle',
  description:
    'Assinatura mensal do Wealth & Wellness: encontro ao vivo toda quinta e a biblioteca liberada.',
};

/**
 * One address, two faces.
 *
 * The plan listed `/circle` under both the public and the signed-in groups,
 * which Next cannot route — route groups do not change the URL, so the two
 * would collide at build time. They are the same page here, deciding by who is
 * asking: a stranger gets the pitch, a member gets tonight's link. That is
 * also the better behaviour. A member who clicks a link to /circle from an
 * email should land on their meeting, not on a page trying to sell them what
 * they already pay for.
 */
export default async function CirclePage() {
  const user = await currentUser();

  let hasCircle = false;
  if (user) {
    const supabase = await serverClient();
    // RLS answers: rows come back only for products this person holds.
    const { data } = await supabase
      .from('entitlements')
      .select('expires_at')
      .eq('product', 'circle')
      .in('status', ['active', 'past_due']);

    hasCircle = (data ?? []).some(
      (row) => row.expires_at === null || new Date(row.expires_at) > new Date(),
    );
  }

  return hasCircle ? <MemberView /> : <SalesView user={user} />;
}

function MeetingLine() {
  return <>{formatDateTime(nextMeeting(new Date()))}</>;
}

function MemberView() {
  const meetUrl = process.env.CIRCLE_MEET_URL?.trim();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">W&amp;W Circle</p>
      <h1 className="mt-4 text-4xl">Seu próximo encontro</h1>

      <div className="mt-10 border border-[var(--border)] bg-[var(--bg-card)] px-6 py-8">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-4)]">
          Ao vivo, no Google Meet
        </p>
        <p className="mt-3 text-lg text-[var(--text-1)]">
          <MeetingLine />
        </p>

        {meetUrl ? (
          <a
            href={meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow mt-6 inline-block border border-[var(--border-hover)] px-6 py-4 text-sm font-medium transition hover:bg-[var(--bg-card-hover)]"
          >
            Entrar na sala
          </a>
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-[var(--text-2)]">
            O link da sala chega por e-mail na véspera.
          </p>
        )}
      </div>

      <p className="mt-8 text-sm leading-relaxed text-[var(--text-2)]">
        As gravações e os materiais ficam na{' '}
        <Link href="/biblioteca" className="text-[var(--accent)] underline underline-offset-4">
          biblioteca
        </Link>
        , liberados enquanto a assinatura estiver em dia.
      </p>
    </div>
  );
}

const INCLUDED = [
  'Encontro ao vivo toda quinta, 20h, com espaço para a sua pergunta.',
  'A gravação no ar depois, para quem não pôde estar.',
  'A biblioteca inteira liberada enquanto a assinatura estiver em dia.',
  'Os guias em PDF, para baixar quando quiser.',
];

function SalesView({ user }: { user: { id: string; email?: string } | null }) {
  const who = user ? { userId: user.id, email: user.email } : {};

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">W&amp;W Circle</p>
      <h1 className="mt-4 text-4xl">
        O acompanhamento que cabe em quem ainda não quer um acompanhamento.
      </h1>

      <p className="mt-6 text-sm leading-relaxed text-[var(--text-2)]">
        Uma hora por semana, ao vivo, sobre o que os seus dados estão dizendo — e o que
        fazer na semana seguinte. Sem consulta, sem ficha, sem compromisso de arco.
      </p>

      <ul className="mt-10 flex flex-col gap-3">
        {INCLUDED.map((line) => (
          <li key={line} className="flex gap-3 text-sm leading-relaxed text-[var(--text-2)]">
            <span aria-hidden="true" className="text-[var(--accent)]">
              —
            </span>
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-12 grid gap-px overflow-hidden border border-[var(--border)] sm:grid-cols-2">
        {CIRCLE_PLANS.map((plan) => {
          const href = checkoutUrl(process.env[plan.envKey], who);
          const perMonth = plan.months > 1 ? priceLabel(plan.priceCents / plan.months) : null;

          return (
            <div key={plan.id} className="flex flex-col bg-[var(--bg-card)] px-6 py-8">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)]">
                {plan.label}
              </p>
              <p className="mt-3 text-3xl text-[var(--text-1)]">{priceLabel(plan.priceCents)}</p>
              <p className="mt-1 text-xs text-[var(--text-4)]">
                {plan.months === 1 ? 'por mês' : `a cada 3 meses · ${perMonth} por mês`}
              </p>

              <div className="mt-auto pt-8">
                {href ? (
                  <a
                    href={href}
                    className="btn-glow block border border-[var(--border-hover)] px-6 py-4 text-center text-sm font-medium transition hover:bg-[var(--bg-card-hover)]"
                  >
                    Assinar
                  </a>
                ) : (
                  <p className="text-xs text-[var(--text-4)]">
                    As assinaturas abrem em breve.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!user && (
        <p className="mt-8 text-sm leading-relaxed text-[var(--text-2)]">
          Já assina?{' '}
          <Link
            href="/entrar?next=%2Fcircle"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            Entre com o Google
          </Link>{' '}
          para ver o seu próximo encontro.
        </p>
      )}

      <p className="mt-10 text-xs leading-relaxed text-[var(--text-4)]">
        Cancele quando quiser: o acesso vale até o fim do período já pago e não renova.{' '}
        <Link href="/circle/termos" className="underline underline-offset-4">
          Condições da assinatura
        </Link>
        .
      </p>
    </div>
  );
}
