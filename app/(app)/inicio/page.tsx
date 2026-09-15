import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Band } from '@/components/ui/Band';
import { Card, CardAction, CardGrid } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { requireUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { countdownLabel, formatDate, formatDateTime } from '@/lib/core/format.core';
import { nextMeeting } from '@/lib/core/circle.core';
import { formatDuration, progressPercent, resumePosition } from '@/lib/core/library.core';

export const metadata: Metadata = {
  title: 'Início',
  robots: { index: false, follow: false },
};

/**
 * Each product says where it goes.
 *
 * These cards used to be four inert boxes listing what somebody had bought,
 * with no link on any of them — which is most of why the platform read as
 * "difícil de procurar as coisas". A card that names a thing you own and
 * cannot be opened is a worse version of no card at all.
 */
const PRODUCTS: Record<string, { name: string; blurb: string; href: string; cta: string }> = {
  protocol: {
    name: 'W&W Protocol',
    blurb: 'Acompanhamento individual. A biblioteca fica sua para sempre.',
    href: '/biblioteca',
    cta: 'Abrir a biblioteca',
  },
  circle: {
    name: 'W&W Circle',
    blurb: 'Encontro ao vivo toda quinta e a biblioteca liberada.',
    href: '/circle',
    cta: 'Ver o próximo encontro',
  },
  connect: {
    name: 'W&W Connect',
    blurb: 'Convidado do evento.',
    href: '/connect',
    cta: 'Ver o evento',
  },
  face_a_face: {
    name: 'Face a Face',
    blurb: 'Sessão avulsa.',
    href: '/conta',
    cta: 'Ver na sua conta',
  },
};

function firstName(full: string | null | undefined, email: string | undefined): string {
  const name = full?.trim().split(/\s+/)[0];
  return name || email?.split('@')[0] || 'por aqui';
}

/**
 * O item embutido volta como objeto numa relação para-um e como array em
 * algumas versões do cliente. Normalizar aqui é mais barato que descobrir em
 * produção que a tela some porque a forma mudou numa atualização de patch.
 */
type ResumeItem = {
  slug: string;
  title: string;
  kind: string;
  duration_seconds: number | null;
  season: string | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function InicioPage() {
  const user = await requireUser();
  const supabase = await serverClient();
  const now = new Date();

  // Read as the person, not around them: the policy returns their own rows and
  // nothing else, so there is no ownership check here to get wrong. The same
  // holds for the embedded content item — `!inner` drops the progress row when
  // RLS refuses the recording, so a replay that stopped being theirs stops
  // being offered without any status check on this page.
  const [{ data: profile }, { data: entitlements }, { data: resumeRows }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase
      .from('entitlements')
      .select('product, status, expires_at')
      .in('status', ['active', 'past_due'])
      .order('product'),
    supabase
      .from('progress')
      .select(
        'position_seconds, completed_at, content_items!inner(slug, title, kind, duration_seconds, season)',
      )
      .is('completed_at', null)
      .order('last_seen_at', { ascending: false })
      .limit(1),
  ]);

  const live = (entitlements ?? []).filter(
    (row) => row.expires_at === null || new Date(row.expires_at) > new Date(),
  );

  const hasCircle = live.some((row) => row.product === 'circle');
  const meeting = nextMeeting(now);

  // Só vira cartão quando de fato há onde retomar. `resumePosition` já derruba
  // a posição na cauda da gravação, e oferecer "continuar" num item que
  // recomeçaria do zero é a mentira que o `progressPercent` existe para evitar.
  const resumeRow = (resumeRows ?? [])[0];
  const resumeItem = resumeRow ? one<ResumeItem>(resumeRow.content_items as never) : null;
  const resumeAt = resumeRow
    ? resumePosition(
        { position_seconds: resumeRow.position_seconds, completed_at: resumeRow.completed_at },
        resumeItem?.duration_seconds,
      )
    : 0;
  const resume =
    resumeItem && resumeAt > 0
      ? {
          item: resumeItem,
          at: resumeAt,
          percent: progressPercent(
            {
              position_seconds: resumeRow.position_seconds,
              completed_at: resumeRow.completed_at,
            },
            resumeItem.duration_seconds,
          ),
        }
      : null;

  return (
    <div className="flex flex-col gap-14 md:gap-20">
      <div>
        <SectionHeading
          eyebrow="Sua área"
          title={
            <>
              Olá, <em className="accent-word">{firstName(profile?.full_name, user.email)}</em>.
            </>
          }
        />
        <div className="rule-gold mt-7" aria-hidden="true" />
      </div>

      {/* The one thing with a date on it goes first, because it is the only
          thing on this page that expires. What it shows first is the distance,
          not the date: "Em 3 dias" is the part somebody acts on, and the full
          weekday and hour is the detail they confirm underneath. */}
      {hasCircle && (
        <Band
          eyebrow="Próximo encontro"
          title="Toda quinta, 20h."
          lede="Uma hora sobre os seus próprios números, com espaço para a sua pergunta. A gravação entra na biblioteca depois."
        >
          <p className="stat-num">{countdownLabel(meeting, now)}</p>
          <p className="meta mt-3 text-[var(--text-3)]">{formatDateTime(meeting)}</p>
          <div className="mt-7">
            <Button href="/circle" variant="primary">
              Entrar na sala
            </Button>
          </div>
        </Band>
      )}

      {resume && (
        <Band
          eyebrow="Continuar"
          title="Você parou no meio."
          lede="Retoma exatamente de onde a gravação ficou, não do começo."
        >
          <div className="border border-[var(--border)]">
            <Card href={`/biblioteca/${resume.item.slug}`}>
              <p className="card-title">{resume.item.title}</p>
              <div className="mt-5">
                <ProgressBar
                  percent={resume.percent}
                  label={`Progresso em ${resume.item.title}`}
                />
              </div>
              <CardAction>Retomar em {formatDuration(resume.at)}</CardAction>
            </Card>
          </div>
        </Band>
      )}

      <Band
        eyebrow="Seus acessos"
        title="O que já é seu."
        lede="Tudo que está ligado a este e-mail. Cada cartão abre onde a coisa mora."
      >
        {live.length > 0 ? (
          <CardGrid columns={2}>
            {live.map((row) => {
              const product = PRODUCTS[row.product] ?? {
                name: row.product,
                blurb: '',
                href: '/conta',
                cta: 'Ver na sua conta',
              };

              return (
                <li key={row.product}>
                  <Card href={product.href}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="card-title">{product.name}</p>
                      <Badge tone={row.expires_at ? 'neutral' : 'accent'}>
                        {row.expires_at ? `Até ${formatDate(row.expires_at)}` : 'Vitalício'}
                      </Badge>
                    </div>
                    {product.blurb && <p className="prose-body mt-3">{product.blurb}</p>}
                    <CardAction>{product.cta}</CardAction>
                  </Card>
                </li>
              );
            })}
          </CardGrid>
        ) : (
          <EmptyState
            title="Ainda não há nenhum acesso ligado a este e-mail."
            action={
              <>
                <Button href="/circle" variant="primary">
                  Conhecer o Circle
                </Button>
                <Button href="/sem-acesso" variant="quiet">
                  Comprei e não apareceu
                </Button>
              </>
            }
          >
            Se você já comprou, provavelmente pagou com outro endereço. Me avise que eu
            ligo os dois.
          </EmptyState>
        )}
      </Band>
    </div>
  );
}
