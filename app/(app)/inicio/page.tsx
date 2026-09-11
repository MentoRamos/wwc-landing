import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardGrid } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Meta } from '@/components/ui/Meta';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { requireUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime } from '@/lib/core/format.core';
import { nextMeeting } from '@/lib/core/circle.core';

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

  const hasCircle = live.some((row) => row.product === 'circle');

  return (
    <div className="flex flex-col gap-14">
      <SectionHeading
        className="max-w-2xl"
        eyebrow="Sua área"
        title={`Olá, ${firstName(profile?.full_name, user.email)}.`}
      />

      {/* The one thing with a date on it goes first, because it is the only
          thing on this page that expires. */}
      {hasCircle && (
        <section className="max-w-2xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-7">
          <p className="eyebrow">Próximo encontro</p>
          <p className="mt-3 text-lg text-[var(--text-1)]">
            {formatDateTime(nextMeeting(new Date()))}
          </p>
          <div className="mt-6">
            <Button href="/circle" variant="primary">
              Entrar na sala
            </Button>
          </div>
        </section>
      )}

      <section className="max-w-2xl">
        <h2 className="section-title">Seus acessos</h2>

        {live.length > 0 ? (
          <CardGrid className="mt-6">
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
                      <p className="text-lg text-[var(--text-1)]">{product.name}</p>
                      <Badge tone={row.expires_at ? 'neutral' : 'accent'}>
                        {row.expires_at ? `Até ${formatDate(row.expires_at)}` : 'Vitalício'}
                      </Badge>
                    </div>
                    {product.blurb && <p className="prose-body mt-2">{product.blurb}</p>}
                    <Meta className="mt-4" parts={[product.cta]} />
                  </Card>
                </li>
              );
            })}
          </CardGrid>
        ) : (
          <div className="mt-6">
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
          </div>
        )}
      </section>
    </div>
  );
}
