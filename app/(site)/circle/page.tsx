import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Band } from '@/components/ui/Band';
import { Button } from '@/components/ui/Button';
import { Card, CardAction, CardGrid } from '@/components/ui/Card';
import { Meta } from '@/components/ui/Meta';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { InterestForm } from '@/components/interest/InterestForm';
import { currentUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { CIRCLE_PLANS, checkoutUrl, holdsCircle, nextMeeting, priceLabel } from '@/lib/core/circle.core';
import { countdownLabel, formatDateTime } from '@/lib/core/format.core';
import { formatDuration } from '@/lib/core/library.core';
import { LatestArticles } from '@/components/articles/LatestArticles';
import { listArticles } from '@/lib/articles/queries';

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
    title: 'W&W Circle · uma hora por semana sobre os seus próprios dados',
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
    title: 'W&W Circle · uma hora por semana sobre os seus próprios dados',
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

    // A regra da data mora em `holdsCircle`, testada. Aqui ela era uma linha
    // solta dentro do componente — e é a linha que decide se um assinante em
    // dia leva na cara uma página tentando vender o que ele já paga.
    hasCircle = holdsCircle(data);
  }

  const latest = await listArticles(3);

  return (
    <>
      {hasCircle ? <MemberView /> : <SalesView user={user} />}
      <LatestArticles articles={latest} />
    </>
  );
}

async function MemberView() {
  const meetUrl = process.env.CIRCLE_MEET_URL?.trim();
  const now = new Date();

  // As gravações passadas, que é o que faltava aqui: a tela dizia a data do
  // próximo encontro e mais nada, então na segunda-feira, quando o encontro
  // está longe, ela não tinha o que oferecer. O catálogo é a view sem
  // `youtube_id`, e o destravamento sai do que a política devolveu, pela
  // mesma regra da biblioteca.
  const supabase = await serverClient();
  const [{ data: recorded }, { data: entitled }] = await Promise.all([
    supabase
      .from('content_catalog')
      .select('id, slug, title, duration_seconds, season')
      .eq('collection', 'encontros')
      .order('sort_order', { ascending: false })
      .limit(3),
    supabase.from('content_items').select('id'),
  ]);

  const mine = new Set((entitled ?? []).map((row) => row.id as string));
  const replays = (recorded ?? []).map((row) => ({
    slug: row.slug as string,
    title: row.title as string,
    duration_seconds: row.duration_seconds as number | null,
    season: row.season as string | null,
    locked: !mine.has(row.id as string),
  }));

  return (
    <div className="container-lp w-full py-16">
      <div>
        <SectionHeading eyebrow="W&W Circle" title="Seu próximo encontro" />
        <div className="rule-gold mt-7" aria-hidden="true" />
      </div>

      {/*
        Esta metade da página é a que um assinante abre toda quinta, e era a
        mais vazia da plataforma: um cartão de data preso a `max-w-2xl` num
        container de 1440px, com o rodapé mais largo que o próprio conteúdo. A
        faixa devolve a ela a coluna editorial que a face de venda já tinha.
      */}
      <div className="mt-14">
        <Band
          eyebrow="Ao vivo"
          title="No Google Meet."
          lede={
            <>
              As gravações e os materiais ficam na{' '}
              <Link
                href="/biblioteca"
                className="link-draw text-[var(--accent)]"
              >
                biblioteca
              </Link>
              , liberados enquanto a assinatura estiver em dia.
            </>
          }
        >
          <div className="border border-[var(--border)] bg-[var(--bg-card)] px-6 py-8">
            <p className="eyebrow">Quando</p>
            {/* A distância primeiro, a data embaixo: "Em 3 dias" é o que a
                pessoa usa para decidir, e o dia da semana com a hora é o que
                ela confere depois. É a mesma ordem da home. */}
            <p className="stat-num mt-4">{countdownLabel(nextMeeting(now), now)}</p>
            <p className="meta mt-3 text-[var(--text-3)]">
              {formatDateTime(nextMeeting(now))}
            </p>

            {meetUrl ? (
              <div className="mt-8">
                <Button href={meetUrl} variant="primary" size="lg">
                  Entrar na sala
                </Button>
              </div>
            ) : (
              <p className="prose-body mt-6">O link da sala chega por e-mail na véspera.</p>
            )}
          </div>
        </Band>
      </div>

      {replays.length > 0 && (
        <div className="mt-14">
          <Band
            eyebrow="Encontros anteriores"
            title="O que já rolou."
            lede="As gravações ficam na biblioteca. Nenhum encontro se perde por você ter faltado."
          >
            <CardGrid columns={2}>
              {replays.map((replay) => (
                <li key={replay.slug}>
                  <Card
                    href={replay.locked ? '/circle' : `/biblioteca/${replay.slug}`}
                    locked={replay.locked}
                  >
                    <p className="card-title">{replay.title}</p>
                    <Meta
                      className="mt-3"
                      parts={[
                        'Gravação',
                        formatDuration(replay.duration_seconds),
                        replay.season,
                      ]}
                    />
                    <CardAction>{replay.locked ? 'Bloqueado' : 'Assistir'}</CardAction>
                  </Card>
                </li>
              ))}
            </CardGrid>
          </Band>
        </div>
      )}
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
              title={
                <>
                  O acompanhamento que cabe em quem{' '}
                  <em className="accent-word">ainda não quer</em> um acompanhamento.
                </>
              }
              lede="Uma hora por semana, ao vivo, sobre o que os seus dados estão dizendo e o que fazer na semana seguinte. Sem consulta, sem ficha, sem compromisso de arco."
            />

            <ul className="mt-10 flex flex-col gap-3">
              {INCLUDED.map((line) => (
                <li key={line} className="prose-body flex items-baseline gap-4">
                  {/* Era um `&mdash;`, ou seja, travessão em texto visível com
                      outro nome. Como marcador ele também não era pontuação:
                      uma régua curta diz "item da lista" sem fingir ser
                      palavra, e é o mesmo gesto do resto da página. */}
                  <span
                    aria-hidden="true"
                    className="mt-2 h-px w-4 shrink-0 bg-[var(--text-4)]"
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* A foto terminava num retângulo de borda dura sobre o preto: a
              imagem parava, o fundo começava, e a emenda era o elemento mais
              visível da dobra. O degradê do próprio `--bg` na base dissolve a
              aresta, que é como uma peça impressa resolve foto sobre fundo
              chapado. */}
          <div className="relative aspect-[3/2] overflow-hidden border border-[var(--border)] lg:aspect-[4/5]">
            <Image
              src={OG_IMAGE}
              alt="Kauã Ramos conduzindo um encontro do Wealth &amp; Wellness"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover object-center"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--bg)] to-transparent"
            />
          </div>
        </div>

      {/*
        O bloco de preços era `max-w-3xl` dentro de um container de 1440px:
        ocupava pouco mais da metade e deixava 40% da largura em preto ao lado,
        que é o defeito que o design system chama de falha de enquadramento. A
        correção não é esticar os dois cartões até a borda (dois cartões de
        700px leem como banner), e sim dar à faixa a coluna editorial que ela
        não tinha: o título da decisão à esquerda, os planos à direita.
      */}
      <section className="mt-20 border-t border-[var(--border)] pt-14">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="eyebrow">A assinatura</p>
            <h2 className="section-title mt-4">Duas formas de entrar.</h2>
            <div className="rule-gold mt-6" aria-hidden="true" />
            <p className="prose-body mt-6">
              A mesma coisa nos dois planos. O trimestral só reconhece que
              três meses é o tempo em que um hábito começa a aparecer nos
              dados.
            </p>
          </div>

          <div className="grid gap-px self-start overflow-hidden border border-[var(--border)] sm:grid-cols-2">
          {plans.map((plan) => {
            const isFeatured = plan.id === featured?.id;

            return (
              /* O cartão inteiro responde ao clique, e mesmo assim existe um
                 link só. O botão continua sendo o link de verdade e a sua
                 camada absoluta cobre o cartão: aninhar uma âncora dentro de
                 outra seria HTML inválido, e repetir o mesmo destino em dois
                 elementos daria ao teclado duas paradas para uma decisão. */
              <div
                key={plan.id}
                className={`relative flex flex-col px-6 py-8 transition-colors ${
                  isFeatured ? 'bg-[var(--bg-card-hover)]' : 'bg-[var(--bg-card)]'
                } ${plan.href ? 'hover:bg-[var(--bg-card-hover)]' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="meta">{plan.label}</p>
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
                      className="w-full after:absolute after:inset-0 after:content-['']"
                    >
                      Assinar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </section>

        {/*
          The page said "as assinaturas abrem em breve" in both plan cards and
          then asked for nothing. That is the single most expensive sentence on
          the platform: it is shown to somebody who has just read the whole
          pitch and decided, and it sends them away with no way back.
        */}
        {!anyCheckout && (
          <section className="mt-20 border-t border-[var(--border)] pt-14">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
              <div>
                <p className="eyebrow">Lista de espera</p>
                <h2 className="section-title mt-4">As assinaturas abrem em breve.</h2>
                <div className="rule-gold mt-6" aria-hidden="true" />
                <p className="prose-body mt-6">
                  Deixe o seu e-mail e você entra antes de a vaga virar anúncio. Os
                  primeiros assinantes definem o tema das primeiras quintas.
                </p>
              </div>
              <div className="border border-[var(--border)] bg-[var(--bg-card)] px-6 py-8">
                <InterestForm product="circle" source="circle-sem-checkout" />
              </div>
            </div>
          </section>
        )}

        {/*
          A página terminava com duas frases soltas empilhadas à esquerda e
          depois um vão até o rodapé: ela parava de falar em vez de fechar. As
          duas respondem à mesma coisa — "e se eu não quiser?" — então viram
          uma faixa de fecho, lado a lado, com a régua que marca fim de
          assunto em todas as outras seções.
        */}
        <section className="mt-20 border-t border-[var(--border)] pt-10">
          <div className="grid gap-8 sm:grid-cols-2 sm:items-start">
            {!user && (
              <p className="prose-body">
                Já assina?{' '}
                <Link href="/entrar?next=%2Fcircle" className="link-draw">
                  Entre com o Google
                </Link>{' '}
                para ver o seu próximo encontro.
              </p>
            )}

            <p className="text-xs leading-relaxed text-[var(--text-4)] sm:col-start-2">
              Cancele quando quiser: o acesso vale até o fim do período já pago e não
              renova.{' '}
              <Link href="/circle/termos" className="underline underline-offset-4">
                Condições da assinatura
              </Link>
              .
            </p>
          </div>
        </section>
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
