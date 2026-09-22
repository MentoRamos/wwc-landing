import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Poster, PosterRail } from '@/components/ui/Poster';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { requireUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import {
  buildShelf,
  formatDuration,
  progressPercent,
  type CatalogItem,
} from '@/lib/core/library.core';

export const metadata: Metadata = {
  title: 'Biblioteca',
  robots: { index: false, follow: false },
};

const COLLECTION_LABEL: Record<string, string> = {
  guias: 'Guias',
  encontros: 'Encontros',
};

/**
 * The shelf, with locks.
 *
 * Two reads, and the difference between them is the point. `content_catalog`
 * is a definer view without `youtube_id` or `storage_path`, so it can show
 * everyone that a replay exists and what it is about. `content_items` goes
 * through RLS and comes back holding only what this person may open.
 *
 * Showing the locked ones is deliberate: a member who sees six replays they
 * cannot open knows what the Circle is for. Showing them is a sales argument;
 * showing the video id would be a leak.
 *
 * What the sales argument was missing was the sentence that completes it. A
 * locked card said "Bloqueado" and stopped there, so the one moment where
 * somebody actively wants what the Circle sells had no way to buy it.
 */
export default async function BibliotecaPage() {
  await requireUser();
  const supabase = await serverClient();

  const [{ data: catalog }, { data: entitled }, { data: progress }] = await Promise.all([
    supabase
      .from('content_catalog')
      .select(
        'id, slug, kind, collection, title, description, duration_seconds, season, required_products, sort_order',
      ),
    supabase.from('content_items').select('id'),
    // A terceira leitura é o que faz a prateleira parar de ser um índice: sem
    // ela, um item já começado é visualmente idêntico a um nunca aberto.
    supabase.from('progress').select('content_item_id, position_seconds, completed_at'),
  ]);

  const seen = new Map(
    (progress ?? []).map((row) => [
      row.content_item_id as string,
      { position_seconds: row.position_seconds as number, completed_at: row.completed_at as string | null },
    ]),
  );

  const shelves = buildShelf(
    (catalog ?? []) as CatalogItem[],
    new Set((entitled ?? []).map((row) => row.id as string)),
  );

  const openCount = shelves.reduce(
    (total, shelf) => total + shelf.items.filter((item) => !item.locked).length,
    0,
  );
  const lockedCount = shelves.reduce(
    (total, shelf) => total + shelf.items.filter((item) => item.locked).length,
    0,
  );

  return (
    <div className="flex flex-col gap-14">
      <SectionHeading
        eyebrow="Biblioteca"
        title="Tudo o que é seu, num lugar só."
        lede={
          openCount === 0 && shelves.length > 0
            ? 'Nada aqui está liberado para o seu acesso ainda. A prateleira fica à vista de propósito, assim você sabe o que existe.'
            : undefined
        }
      >
        {lockedCount > 0 && (
          <div className="mt-8">
            <Button href="/circle" variant="primary">
              Liberar {lockedCount === 1 ? 'o item bloqueado' : `os ${lockedCount} bloqueados`}
            </Button>
          </div>
        )}
      </SectionHeading>

      {shelves.length === 0 ? (
        <EmptyState
          title="A biblioteca ainda está vazia."
          action={
            <Button href="/circle" variant="quiet">
              Ver o que vem por aí
            </Button>
          }
        >
          Os guias e as gravações dos encontros entram aqui conforme saem. Nada foi
          publicado ainda.
        </EmptyState>
      ) : (
        shelves.map((shelf) => {
          const open = shelf.items.filter((item) => !item.locked).length;

          return (
          <section key={shelf.collection}>
            {/* O nome da prateleira era do tamanho de um rótulo, e a tela
                ficava com dois níveis: o título da página e o do card. Este é
                o degrau do meio, e o filete continua a linha até a contagem,
                que é a resposta para "quanto disto é meu". */}
            <div className="flex items-baseline gap-4">
              <h2 className="section-title">
                {COLLECTION_LABEL[shelf.collection] ?? shelf.collection}
              </h2>
              <span className="h-px flex-1 bg-[var(--border)]" aria-hidden="true" />
              <p className="meta shrink-0">
                {open === shelf.items.length
                  ? `${shelf.items.length} ${shelf.items.length === 1 ? 'item' : 'itens'}`
                  : `${open} de ${shelf.items.length} liberados`}
              </p>
            </div>

            {/*
              A prateleira deixou de ser grade e virou fileira.

              Cartão deitado é a forma de uma lista de arquivos: cabem três por
              linha, o título divide a largura com a descrição, e vinte itens
              viram vinte blocos iguais que o olho percorre um a um. A capa em
              pé é a forma que o setor inteiro usa para acervo, e o motivo é
              mecânico: cabem cinco na mesma largura, a fileira se percorre num
              gesto só, e o título fica sozinho embaixo com a largura toda.

              O que se perde é a descrição, que não cabe sob uma capa. Ela não
              fazia falta aqui: quem varre a prateleira está procurando qual
              abrir, e é para isso que serve a ficha do item.
            */}
            <PosterRail>
              {shelf.items.map((item, i) => {
                const percent = item.locked
                  ? 0
                  : progressPercent(seen.get(item.id), item.duration_seconds);

                return (
                  <Poster
                    key={item.id}
                    href={item.locked ? '/circle' : `/biblioteca/${item.slug}`}
                    title={item.title}
                    index={i + 1}
                    meta={
                      [
                        item.kind === 'pdf' ? 'PDF' : 'Gravação',
                        formatDuration(item.duration_seconds),
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    }
                    locked={item.locked}
                    done={percent === 100}
                    percent={percent}
                  />
                );
              })}
            </PosterRail>
          </section>
          );
        })
      )}
    </div>
  );
}
