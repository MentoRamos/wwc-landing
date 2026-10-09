import Link from 'next/link';
import { ArticleGrid } from '@/components/articles/ArticleCards';
import type { ArticleSummary } from '@/lib/articles/queries';

/**
 * Os três artigos mais recentes, no pé do /circle.
 *
 * Para quem ainda não assina, é a amostra do tipo de leitura que o Circle
 * faz dos dados. Para quem assina, é o que saiu desde a última quinta. Sem
 * artigo nenhum, o bloco some em vez de anunciar uma seção vazia.
 */
export function LatestArticles({ articles }: { articles: ArticleSummary[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="container-lp w-full pb-20" aria-labelledby="ultimos-artigos">
      <div className="border-t border-[var(--border)] pt-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Artigos</p>
            <h2 id="ultimos-artigos" className="section-title mt-4">
              O estudo lido, para você não precisar.
            </h2>
          </div>
          <Link
            href="/circle/artigos"
            className="inline-flex min-h-11 items-center gap-2 border border-[var(--border)] px-5 text-[11px] uppercase tracking-[0.18em] text-[var(--text-2)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
          >
            Todos os artigos <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <div className="mt-10">
          <ArticleGrid articles={articles} />
        </div>
      </div>
    </section>
  );
}
