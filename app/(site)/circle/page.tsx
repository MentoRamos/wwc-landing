import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { InterestForm } from '@/components/interest/InterestForm';
import { currentUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { CIRCLE_PLANS, checkoutUrl, nextMeeting, priceLabel } from '@/lib/core/circle.core';
import { formatDateTime } from '@/lib/core/format.core';

/**
 * This page is shared as a link, and almost always on WhatsApp.
 *
 * Without an `openGraph` block the preview card falls back to whatever the
 * root layout says, which is the platform's generic description — so the one
 * page that sells arrived in the conversation looking like a link to a site
 * rather than to an offer. The image is the same 3:2 studio frame used on the
 * page itself, so the card and the page agree.
 */
const OG_IMAGE = '/photos/kaua-presenting.jpg';
const DESCRIPTION =
  'Assinatura mensal do Wealth & Wellness: encontro ao vivo toda quinta, 20h, e a biblioteca liberada enquanto a assinatura estiver em dia.';

export const metadata: Metadata = {
  title: 'W&W Circle',
  description: DESCRIPTION,
  alternates: { canonical: '/circle' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/circle',
    siteName: 'Wealth & Wellness',
    title: 'W&W Circle — uma hora por semana sobre os seus próprios dados',
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Kauã Ramos conduzindo um encontro do Wealth & Wellness',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'W&W Circle — uma hora por semana sobre os seus próprios dados',
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
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

function MemberView() {
  const meetUrl = process.env.CIRCLE_MEET_URL?.trim();

  return (
    <div className="container-lp w-full py-16">
      <div className="max-w-2xl">
        <SectionHeading eyebrow="W&W Circle" title="Seu próximo encontro" />

        <div className="mt-10 border border-[var(--border)] bg-[var(--bg-card)] px-6 py-8">
          <p className="eyebrow">Ao vivo, no Google Meet</p>
          <p className="mt-3 text-lg text-[var(--text-1)]">
            {formatDateTime(nextMeeting(new Date()))}
          </p>

          {meetUrl ? (
            <div className="mt-6">
              <Button href={meetUrl} variant="primary" size="lg">
                Entrar na sala
              </Button>
            </div>
          ) : (
            <p className="prose-body mt-6">O link da sala chega por e-mail na véspera.</p>
          )}
        </div>

        <p className="prose-body mt-8">
          As gravações e os materiais ficam na{' '}
          <Link href="/biblioteca" className="text-[var(--accent)] underline underline-offset-4">
            biblioteca
          </Link>
          , liberados enquanto a assinatura estiver em dia.
        </p>
      </div>
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

  const plans = CIRCLE_PLANS.map((plan) => {
    const monthly = CIRCLE_PLANS.find((other) => other.months === 1);
    const savingCents = monthly ? monthly.priceCents * plan.months - plan.priceCents : 0;

    return {
      ...plan,
      href: checkoutUrl(process.env[plan.envKey], who),
      perMonth: plan.months > 1 ? priceLabel(plan.priceCents / plan.months) : null,
      savingCents,
    };
  });

  // The one plan the page argues for. Everything about the layout below — the
  // badge, the order, the single gold button — follows from picking it here
  // rather than laying two equal options side by side and leaving the reader
  // to do the arithmetic.
  const featured = plans.find((plan) => plan.savingCents > 0) ?? plans[0];
  const anyCheckout = plans.some((plan) => plan.href);

  return (
    <>
      <div className="container-lp w-full py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="W&W Circle"
              title="O acompanhamento que cabe em quem ainda não quer um acompanhamento."
              lede="Uma hora por semana, ao vivo, sobre o que os seus dados estão dizendo e o que fazer na semana seguinte. Sem consulta, sem ficha, sem compromisso de arco."
            />

            <ul className="mt-10 flex flex-col gap-3">
              {INCLUDED.map((line) => (
                <li key={line} className="prose-body flex gap-3">
                  <span aria-hidden="true" className="text-[var(--accent)]">
                    &mdash;
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative aspect-[3/2] overflow-hidden border border-[var(--border)] lg:aspect-[4/5]">
            <Image
              src={OG_IMAGE}
              alt="Kauã Ramos conduzindo um encontro do Wealth &amp; Wellness"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover object-center"
            />
          </div>
        </div>

        <div className="mt-16 grid max-w-3xl gap-px overflow-hidden border border-[var(--border)] sm:grid-cols-2">
          {plans.map((plan) => {
            const isFeatured = plan.id === featured?.id;

            return (
              <div
                key={plan.id}
                className={`flex flex-col px-6 py-8 ${
                  isFeatured ? 'bg-[var(--bg-card-hover)]' : 'bg-[var(--bg-card)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="eyebrow">{plan.label}</p>
                  {isFeatured && plan.savingCents > 0 && (
                    <Badge tone="accent">
                      Economize {priceLabel(plan.savingCents)}
                    </Badge>
                  )}
                </div>

                {/* The number a monthly subscription is compared against is
                    always the monthly one, so the quarterly plan leads with
                    its per-month price and puts the total underneath. */}
                <p className="mt-4 text-3xl text-[var(--text-1)]">
                  {plan.perMonth ?? priceLabel(plan.priceCents)}
                  <span className="ml-2 text-sm text-[var(--text-3)]">por mês</span>
                </p>
                <p className="meta mt-2">
                  {plan.months === 1
                    ? 'Cobrado todo mês'
                    : `${priceLabel(plan.priceCents)} a cada 3 meses`}
                </p>

                {plan.href && (
                  <div className="mt-auto pt-8">
                    <Button
                      href={plan.href}
                      variant={isFeatured ? 'primary' : 'secondary'}
                      size="lg"
                      className="w-full"
                    >
                      Assinar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/*
          The page said "as assinaturas abrem em breve" in both plan cards and
          then asked for nothing. That is the single most expensive sentence on
          the platform: it is shown to somebody who has just read the whole
          pitch and decided, and it sends them away with no way back.
        */}
        {!anyCheckout && (
          <section className="mt-14 max-w-xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-8">
            <h2 className="section-title">As assinaturas abrem em breve.</h2>
            <p className="prose-body mt-3">
              Deixe o seu e-mail e você entra antes de a vaga virar anúncio. Os
              primeiros assinantes definem o tema das primeiras quintas.
            </p>
            <div className="mt-8">
              <InterestForm product="circle" source="circle-sem-checkout" />
            </div>
          </section>
        )}

        {!user && (
          <p className="prose-body mt-8">
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

        <p className="mt-10 max-w-2xl text-xs leading-relaxed text-[var(--text-4)]">
          Cancele quando quiser: o acesso vale até o fim do período já pago e não renova.{' '}
          <Link href="/circle/termos" className="underline underline-offset-4">
            Condições da assinatura
          </Link>
          .
        </p>
      </div>

      {/* On a phone the prices scroll away and never come back. The bar keeps
          the decision one tap away without taking a second gold gesture: it is
          the same button, following you.

          A signed-in member already has the tab bar pinned to the bottom, so
          this one sits on top of it rather than over it — the hottest lead on
          the platform is somebody logged in who has not subscribed, and
          burying either bar under the other would cost exactly them. */}
      {featured?.href && anyCheckout && (
        <>
          <div aria-hidden="true" className="h-24 md:hidden" />
          <div
            className={`fixed inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur md:hidden ${
              user
                ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))]'
                : 'bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
            }`}
          >
            <Button href={featured.href} variant="primary" size="lg" className="w-full">
              Assinar por {featured.perMonth ?? priceLabel(featured.priceCents)} por mês
            </Button>
          </div>
        </>
      )}
    </>
  );
}
