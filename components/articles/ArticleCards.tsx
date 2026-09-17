import Link from 'next/link';
import { CoverImage } from '@/components/articles/CoverImage';
import { articlePath } from '@/lib/core/articles.core';
import { topicLabel } from '@/lib/core/covers.core';
import { formatLongDate } from '@/lib/core/format.core';
import type { ArticleSummary } from '@/lib/articles/queries';

/**
 * Os artigos em cards.
 *
 * A primeira versão era uma lista com filete entre os itens, e o Kauã leu
 * certo: dez títulos um embaixo do outro viram um bloco só. Cada artigo agora
 * é um objeto com borda, capa e um "Ler artigo" que diz o que o clique faz.
 * O cartão inteiro é o link (alvo grande no celular), e o destaque, o mais
 * recente, ocupa a largura toda com a capa ao lado do texto no desktop.
 */

function Meta({ article }: { article: ArticleSummary }) {
  return (
    <p className="meta flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-[var(--accent)]">{topicLabel(article.topic)}</span>
      <span aria-hidden="true">·</span>
      <span>{formatLongDate(article.published_at)}</span>
    </p>
  );
}

function ReadMore() {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
      Ler artigo
      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
        &rarr;
      </span>
    </span>
  );
}

const CARD =
  'group flex h-full flex-col overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] ' +
  'transition duration-300 hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] ' +
  'focus-visible:border-[var(--accent)] focus-visible:outline-none';

const ZOOM = 'transition-transform duration-700 ease-out group-hover:scale-[1.03]';

export function FeaturedArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <Link href={articlePath(article.slug)} className={`${CARD} lg:grid lg:grid-cols-[1.35fr_1fr]`}>
      <div className="aspect-[16/9] overflow-hidden lg:aspect-auto lg:min-h-[26rem]">
        <CoverImage article={article} priority sizes="(min-width: 1024px) 58vw, 100vw" className={ZOOM} />
      </div>
      <div className="flex flex-col gap-5 p-6 sm:p-8 lg:justify-center lg:p-12">
        <p className="eyebrow">Mais recente</p>
        <h2 className="page-title !text-[clamp(1.75rem,1.3rem+1.6vw,2.6rem)] transition group-hover:text-[var(--accent)]">
          {article.title}
        </h2>
        <p className="lede">{article.dek}</p>
        <Meta article={article} />
        <div className="mt-2">
          <ReadMore />
        </div>
      </div>
    </Link>
  );
}

export function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <Link href={articlePath(article.slug)} className={CARD}>
      <div className="aspect-[3/2] overflow-hidden">
        <CoverImage
          article={article}
          sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
          className={ZOOM}
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Meta article={article} />
        <h3 className="card-title transition group-hover:text-[var(--accent)]">{article.title}</h3>
        <p className="prose-body line-clamp-3">{article.dek}</p>
        <div className="mt-auto pt-2">
          <ReadMore />
        </div>
      </div>
    </Link>
  );
}

export function ArticleGrid({ articles }: { articles: ArticleSummary[] }) {
  return (
    <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {articles.map((article) => (
        <li key={article.slug}>
          <ArticleCard article={article} />
        </li>
      ))}
    </ul>
  );
}
