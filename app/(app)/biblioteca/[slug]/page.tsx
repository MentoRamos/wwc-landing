import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { formatDuration, resumePosition } from '@/lib/core/library.core';
import { Replay } from '@/components/library/Replay';

export const metadata: Metadata = {
  title: 'Biblioteca',
  robots: { index: false, follow: false },
};

/**
 * One item, and only for someone who may open it.
 *
 * There is no `if (hasAccess)` here. The row is fetched with the user's own
 * client, RLS returns nothing to someone without the right product, and
 * `notFound()` is what "nothing" looks like — the same 404 a made-up slug
 * gets, so the page never confirms that a replay exists to someone who cannot
 * watch it.
 */
export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const supabase = await serverClient();

  const { data: item } = await supabase
    .from('content_items')
    .select('id, slug, kind, title, description, storage_path, youtube_id, duration_seconds, season')
    .eq('slug', slug)
    .maybeSingle();

  if (!item) notFound();

  const { data: progress } = await supabase
    .from('progress')
    .select('position_seconds, completed_at')
    .eq('user_id', user.id)
    .eq('content_item_id', item.id)
    .maybeSingle();

  const startAt = resumePosition(progress, item.duration_seconds);
  const duration = formatDuration(item.duration_seconds);

  return (
    <div>
      <Link
        href="/biblioteca"
        className="link-draw text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
      >
        &larr; Biblioteca
      </Link>

      {/*
        O que se assiste manda, e o que se lê acompanha.
        
        A tela inteira vivia presa a `max-w-3xl`, então o player ficava com
        768px de 1440 e o resto da largura ia para o preto. Invertido em faixa,
        a gravação fica na coluna larga e a ficha do item na estreita, que é a
        mesma proporção que as outras telas da área logada usam.
      */}
      {/* No telefone a ordem se inverte: a gravação é o motivo da visita e
          vinha depois da ficha inteira, então quem abria pelo celular rolava
          um título, uma régua, uma linha de meta e a descrição antes de
          chegar no player. No desktop as duas colunas coexistem e a ordem
          visual volta a ser a da leitura. */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="order-2 lg:order-1">
          <h1 className="page-title">{item.title}</h1>
          <div className="rule-gold mt-6" aria-hidden="true" />
          <p className="meta mt-6">
            {item.kind === 'pdf' ? 'PDF' : 'Gravação'}
            {duration && ` · ${duration}`}
            {item.season && ` · ${item.season}`}
          </p>
          {item.description && <p className="prose-body mt-6">{item.description}</p>}
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          {item.kind === 'video' && item.youtube_id ? (
            <Replay
              contentItemId={item.id}
              youtubeId={item.youtube_id}
              title={item.title}
              startAt={startAt}
            />
          ) : (
            <div className="border border-[var(--border)] bg-[var(--bg-card)] px-6 py-8">
              <p className="eyebrow">Arquivo</p>
              <p className="card-title mt-4">Pronto para baixar.</p>

              {/*
                A plain link, not fetch(): the route answers with a redirect to a
                signed URL, and letting the browser follow it is what makes the
                file download without the URL ever passing through our own JS.
              */}
              <a
                href={`/api/biblioteca/${item.slug}/download`}
                className="btn-glow inline-block border border-[var(--border-hover)] bg-[var(--bg-card)] px-6 py-4 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--bg-card-hover)]"
              >
                Baixar o PDF
              </a>
              <p className="mt-4 text-xs text-[var(--text-4)]">
                O link vale por cinco minutos e é gerado na hora, só para você.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
