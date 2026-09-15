import Link from 'next/link';
import { articlePath } from '@/lib/core/articles.core';
import { formatLongDate } from '@/lib/core/format.core';
import type { ArticleSummary } from '@/lib/articles/queries';

/**
 * A lista de artigos, a mesma no índice e no bloco do /circle.
 *
 * Filete entre os itens, não cartão: é uma lista de leitura, como o sumário
 * de uma revista, e cartões lado a lado viram vitrine de app.
 */
export function ArticleList({ articles }: { articles: ArticleSummary[] }) {
  return (
    <ol className="border-t border-[var(--border)]">
      {articles.map((article) => (
        <li key={article.slug} className="border-b border-[var(--border)]">
          <Link
            href={articlePath(article.slug)}
            className="group grid gap-3 py-8 md:grid-cols-[11rem_1fr] md:gap-10"
          >
            <p className="meta pt-1">{formatLongDate(article.published_at)}</p>
            <div>
              <h3 className="section-title transition group-hover:text-[var(--accent)]">
                {article.title}
              </h3>
              <p className="prose-body mt-3">{article.dek}</p>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
