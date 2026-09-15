import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Meta } from '@/components/ui/Meta';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ArticleToggle } from '@/components/admin/ArticleToggle';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { articlePath, isPubliclyVisible } from '@/lib/core/articles.core';
import { formatDate } from '@/lib/core/format.core';

export const metadata: Metadata = {
  title: 'Artigos',
  robots: { index: false, follow: false },
};

type Row = {
  id: string;
  slug: string;
  title: string;
  topic: string | null;
  source_kit: string | null;
  published_at: string;
  hidden_at: string | null;
};

/**
 * Tudo que o cron publicou, inclusive o que foi tirado do ar.
 *
 * Lido pelo cliente do admin: `articles_admin_read` é que devolve os
 * escondidos. O selo diz o que o público está vendo agora, com a mesma regra
 * da política (`isPubliclyVisible`), para a tela e o site nunca discordarem.
 */
export default async function AdminArtigosPage() {
  await requireAdmin();
  const supabase = await serverClient();

  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, title, topic, source_kit, published_at, hidden_at')
    .order('published_at', { ascending: false })
    .limit(500);

  const rows = (data ?? []) as Row[];
  const now = new Date();

  return (
    <div className="flex flex-col gap-12">
      <SectionHeading
        eyebrow="Artigos"
        title="O que o cron publicou"
        lede="Um artigo por dia, às 10h, pelo servidor. Despublicar tira do ar na hora; o cron não republica o que você tirou."
      />

      {error ? (
        <p className="prose-body">Não consegui ler os artigos.</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhum artigo ainda.">
          O primeiro aparece aqui depois da próxima execução do cron.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-px overflow-hidden border border-[var(--border)]">
          {rows.map((row) => {
            const live = isPubliclyVisible(row, now);
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-card)] px-6 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={live ? 'accent' : 'neutral'}>
                      {row.hidden_at ? 'Fora do ar' : live ? 'No ar' : 'Agendado'}
                    </Badge>
                    <Link
                      href={articlePath(row.slug)}
                      className="truncate text-sm text-[var(--text-1)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--accent)]"
                    >
                      {row.title}
                    </Link>
                  </div>
                  <Meta
                    className="mt-2"
                    parts={[formatDate(row.published_at), row.topic, row.source_kit]}
                  />
                </div>
                <ArticleToggle id={row.id} title={row.title} hidden={row.hidden_at !== null} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
