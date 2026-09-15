import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArticleBody } from '@/components/articles/ArticleBody';
import { getArticle } from '@/lib/articles/queries';
import { articlePath, readingMinutes } from '@/lib/core/articles.core';
import { formatLongDate } from '@/lib/core/format.core';
import { resolveSiteUrl } from '@/lib/core/site.core';

/**
 * Um artigo. Público, indexável, e publicado por um cron sem revisão humana
 * antes, o que decide três coisas desta página:
 *
 * 1. O aviso de que o texto não substitui avaliação médica e o convite para o
 *    Circle são deste componente, não do markdown. Não dependem de o modelo
 *    ter lembrado de escrevê-los, e não dá para o modelo escrevê-los errado.
 * 2. Slug inexistente ou artigo escondido é `notFound()`, com 404 de verdade.
 *    Nenhum `loading.tsx` acima desta rota (ver
 *    tests/no-streaming-above-404.test.ts): com streaming, o status já teria
 *    saído 200 antes de a página descobrir que o artigo não existe.
 * 3. As fontes aparecem numeradas e clicáveis no fim. Elas são o que separa
 *    este artigo de mais um post de saúde.
 */

// A página e os metadados pedem o mesmo artigo; `cache` faz disso uma leitura.
const load = cache(getArticle);

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await load(slug);
  if (!article) return { title: 'Artigo não encontrado' };

  const path = articlePath(article.slug);
  return {
    title: `${article.title} · W&W Circle`,
    description: article.dek,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      locale: 'pt_BR',
      url: path,
      siteName: 'Wealth & Wellness',
      title: article.title,
      description: article.dek,
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
      authors: ['Kauã Ramos'],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.dek,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await load(slug);
  if (!article) notFound();

  const site = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.dek,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    inLanguage: 'pt-BR',
    mainEntityOfPage: `${site}${articlePath(article.slug)}`,
    author: { '@type': 'Person', name: 'Kauã Ramos' },
    publisher: { '@type': 'Organization', name: 'Wealth & Wellness' },
    citation: article.sources.map((source) => source.url),
  };

  return (
    <article className="container-lp w-full py-16">
      <script
        type="application/ld+json"
        // `<` escapado: título e linha fina vêm de um modelo, e um
        // `</script>` dentro deles fecharia esta tag no meio do JSON.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <Link
        href="/circle/artigos"
        className="link-draw text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
      >
        &larr; Artigos
      </Link>

      <header className="mt-10 max-w-[68ch]">
        <p className="eyebrow">W&amp;W Circle · Artigo</p>
        <h1 className="page-title mt-4">{article.title}</h1>
        <p className="lede mt-6">{article.dek}</p>
        <p className="meta mt-8">
          Kauã Ramos · {formatLongDate(article.published_at)} ·{' '}
          {readingMinutes(article.body_md)} min de leitura
        </p>
        <div className="rule-gold mt-8" aria-hidden="true" />
      </header>

      <div className="mt-12">
        <ArticleBody markdown={article.body_md} />
      </div>

      {article.sources.length > 0 && (
        <section className="mt-16 max-w-[68ch] border-t border-[var(--border)] pt-10" aria-labelledby="fontes">
          <h2 id="fontes" className="eyebrow">
            Fontes
          </h2>
          <ol className="mt-6 flex flex-col gap-4">
            {article.sources.map((source, index) => (
              <li key={`${index}-${source.url}`} className="flex gap-4 text-sm leading-relaxed">
                <span className="meta shrink-0 pt-0.5">{String(index + 1).padStart(2, '0')}</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text-2)] underline decoration-[var(--border)] underline-offset-4 transition hover:text-[var(--text-1)] hover:decoration-[var(--accent-dim)]"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="prose-body mt-12 max-w-[68ch] border-l border-[var(--border)] pl-5 text-sm">
        Este texto é orientação de hábito, feita a partir de estudos publicados. Ele não
        substitui avaliação médica, e não serve para diagnosticar nem para mudar tratamento
        ou medicação. Se algo aqui conversa com um sintoma seu, leve a pergunta a quem te
        acompanha.
      </p>

      <aside className="mt-16 max-w-[68ch] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-8 sm:px-8">
        <p className="eyebrow">W&amp;W Circle</p>
        <p className="section-title mt-4">
          Uma hora por semana, ao vivo, sobre o que os seus dados estão dizendo.
        </p>
        <p className="prose-body mt-4">
          Os artigos são abertos. O encontro de quinta, as gravações e a biblioteca são de
          quem assina.
        </p>
        <div className="mt-7">
          <Button href="/circle" variant="primary">
            Conhecer o Circle
          </Button>
        </div>
      </aside>
    </article>
  );
}
