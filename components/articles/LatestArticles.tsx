import Link from 'next/link';
import { ArticleList } from '@/components/articles/ArticleList';
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
            className="link-draw text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
          >
            Todos os artigos &rarr;
          </Link>
        </div>
        <div className="mt-10">
          <ArticleList articles={articles} />
        </div>
      </div>
    </section>
  );
}
