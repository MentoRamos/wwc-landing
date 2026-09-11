import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardGrid } from '@/components/ui/Card';
import { Meta } from '@/components/ui/Meta';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { requireUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { buildShelf, formatDuration, type CatalogItem } from '@/lib/core/library.core';

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

  const [{ data: catalog }, { data: entitled }] = await Promise.all([
    supabase
      .from('content_catalog')
      .select(
        'id, slug, kind, collection, title, description, duration_seconds, season, required_products, sort_order',
      ),
    supabase.from('content_items').select('id'),
  ]);

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
        className="max-w-2xl"
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
        <p className="prose-body">
          A biblioteca ainda está vazia. Os materiais entram aqui conforme saem.
        </p>
      ) : (
        shelves.map((shelf) => (
          <section key={shelf.collection}>
            <h2 className="eyebrow">
              {COLLECTION_LABEL[shelf.collection] ?? shelf.collection}
            </h2>

            <CardGrid className="mt-6" columns={2}>
              {shelf.items.map((item) => (
                <li key={item.id}>
                  <Card
                    href={item.locked ? '/circle' : `/biblioteca/${item.slug}`}
                    locked={item.locked}
                    className="flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-lg text-[var(--text-1)]">{item.title}</p>
                      {item.locked && <Badge tone="muted">Bloqueado</Badge>}
                    </div>

                    {item.description && <p className="prose-body mt-2">{item.description}</p>}

                    <Meta
                      className="mt-auto pt-4"
                      parts={[
                        item.kind === 'pdf' ? 'PDF' : 'Gravação',
                        formatDuration(item.duration_seconds),
                        item.season,
                      ]}
                    />

                    {/* The locked card is the one place on the platform where
                        somebody is looking straight at what they do not have.
                        It is a link out, not a dead end. */}
                    {item.locked && (
                      <p className="mt-4">
                        <span className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
                          Liberar com o Circle
                        </span>
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </CardGrid>
          </section>
        ))
      )}
    </div>
  );
}
