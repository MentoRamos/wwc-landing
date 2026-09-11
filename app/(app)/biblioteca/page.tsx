import type { Metadata } from 'next';
import Link from 'next/link';
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

  return (
    <div className="flex flex-col gap-14">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">Biblioteca</p>
        <h1 className="mt-4 text-4xl">Tudo o que é seu, num lugar só.</h1>
        {openCount === 0 && shelves.length > 0 && (
          <p className="mt-6 text-sm leading-relaxed text-[var(--text-2)]">
            Nada aqui está liberado para o seu acesso ainda. A prateleira fica à
            vista de propósito — assim você sabe o que existe.
          </p>
        )}
      </header>

      {shelves.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">
          A biblioteca ainda está vazia. Os materiais entram aqui conforme saem.
        </p>
      ) : (
        shelves.map((shelf) => (
          <section key={shelf.collection}>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">
              {COLLECTION_LABEL[shelf.collection] ?? shelf.collection}
            </h2>

            <ul className="mt-6 grid gap-px overflow-hidden border border-[var(--border)] sm:grid-cols-2">
              {shelf.items.map((item) => {
                const duration = formatDuration(item.duration_seconds);

                const body = (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-lg text-[var(--text-1)]">{item.title}</p>
                      {item.locked && (
                        <span
                          aria-label="Bloqueado"
                          className="shrink-0 text-xs uppercase tracking-[0.14em] text-[var(--text-4)]"
                        >
                          Bloqueado
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--text-4)]">
                      {item.kind === 'pdf' ? 'PDF' : 'Gravação'}
                      {duration && ` · ${duration}`}
                      {item.season && ` · ${item.season}`}
                    </p>
                  </>
                );

                return (
                  <li key={item.id} className="bg-[var(--bg-card)]">
                    {item.locked ? (
                      <div className="h-full px-6 py-5 opacity-55">{body}</div>
                    ) : (
                      <Link
                        href={`/biblioteca/${item.slug}`}
                        className="block h-full px-6 py-5 transition hover:bg-[var(--bg-card-hover)]"
                      >
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
