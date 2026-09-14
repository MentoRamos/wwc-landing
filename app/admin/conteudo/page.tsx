import type { Metadata } from 'next';
import { ContentForm } from '@/components/admin/ContentForm';
import { ShelfToggle } from '@/components/admin/ShelfToggle';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/core/format.core';
import { formatDuration } from '@/lib/core/library.core';

export const metadata: Metadata = {
  title: 'Conteúdo',
  robots: { index: false, follow: false },
};

const PRODUCT_LABEL: Record<string, string> = {
  protocol: 'Protocol',
  circle: 'Circle',
  connect: 'Connect',
  face_a_face: 'Face a Face',
};

type Row = {
  id: string;
  slug: string;
  kind: string;
  collection: string;
  title: string;
  duration_seconds: number | null;
  season: string | null;
  required_products: string[];
  published_at: string | null;
  sort_order: number;
};

/**
 * A última peça da Biblioteca que faltava.
 *
 * Sem esta tela, publicar a gravação de uma quinta exigia um INSERT à mão no
 * Supabase — e uma coluna errada ali não dá erro visível: o item aparece na
 * prateleira com um cadeado que não abre, ou pior, um `youtube_id` vaza numa
 * linha que deveria estar trancada.
 *
 * Lê com o cliente do admin pela mesma política que todo mundo:
 * `content_read_entitled` já carrega `or public.is_admin()`, então não existe
 * service role nesta página. O admin enxerga rascunho porque a política diz
 * que sim, não porque esta página resolveu ignorar o RLS.
 */
export default async function ConteudoPage() {
  await requireAdmin();
  const supabase = await serverClient();

  const { data } = await supabase
    .from('content_items')
    .select(
      'id, slug, kind, collection, title, duration_seconds, season, required_products, published_at, sort_order',
    )
    .order('collection', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(300);

  const rows = (data ?? []) as Row[];
  const drafts = rows.filter((row) => row.published_at === null).length;

  return (
    <div className="flex flex-col gap-16">
      {/*
        Cabeçalho e formulário lado a lado, como em `/circle` e em
        `/admin/acessos`: a coluna que explica à esquerda, a que age à direita.
        Empilhados e presos a `max-w-2xl`, os dois deixavam metade da largura
        em preto, que é a falha de enquadramento que o design system reprova.
        A tabela abaixo continua inteira, porque ali a largura é o conteúdo.
      */}
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
        <header>
          <p className="eyebrow">Conteúdo</p>
          <h1 className="page-title mt-4">Publicar</h1>
          <div className="rule-gold mt-6" aria-hidden="true" />
          <p className="prose-body mt-6">
            O que entra aqui aparece na Biblioteca de quem tem o produto exigido. Repetir um
            endereço já existente atualiza aquele item, em vez de criar outro.
          </p>
        </header>

        <section>
          <ContentForm />
        </section>
      </div>

      <section className="flex flex-col gap-6 border-t border-[var(--border)] pt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="section-title">Na prateleira</h2>
          <p className="meta">
            {rows.length} {rows.length === 1 ? 'item' : 'itens'}
            {drafts > 0 && ` · ${drafts} em rascunho`}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="prose-body">
            Nada publicado ainda. O primeiro item que você salvar aparece aqui.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="py-3 pr-4 font-normal text-[var(--text-4)]">Item</th>
                  <th className="py-3 pr-4 font-normal text-[var(--text-4)]">Prateleira</th>
                  <th className="py-3 pr-4 font-normal text-[var(--text-4)]">Quem abre</th>
                  <th className="py-3 pr-4 font-normal text-[var(--text-4)]">Estado</th>
                  <th className="py-3 font-normal text-[var(--text-4)]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const published = row.published_at !== null;
                  const duration = formatDuration(row.duration_seconds);

                  return (
                    <tr key={row.id} className="border-b border-[var(--border)] align-top">
                      <td className="py-4 pr-4">
                        <p className="text-[var(--text-1)]">{row.title}</p>
                        <p className="mt-1 font-mono text-xs text-[var(--text-4)]">
                          /{row.slug}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-4)]">
                          {row.kind === 'pdf' ? 'PDF' : 'Gravação'}
                          {duration && ` · ${duration}`}
                          {row.season && ` · ${row.season}`}
                        </p>
                      </td>

                      <td className="py-4 pr-4 text-[var(--text-2)]">{row.collection}</td>

                      <td className="py-4 pr-4 text-[var(--text-2)]">
                        {row.required_products.length === 0 ? (
                          // Um item publicado sem produto exigido é o caso que
                          // ninguém nota: a prateleira mostra o cadeado e ele não
                          // abre nem para quem pagou.
                          <span className="text-[var(--accent)]">
                            ninguém — falta escolher o produto
                          </span>
                        ) : (
                          row.required_products
                            .map((product) => PRODUCT_LABEL[product] ?? product)
                            .join(', ')
                        )}
                      </td>

                      <td className="py-4 pr-4 text-[var(--text-2)]">
                        {published ? `No ar desde ${formatDate(row.published_at!)}` : 'Rascunho'}
                      </td>

                      <td className="py-4">
                        <ShelfToggle id={row.id} title={row.title} published={published} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
