import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArticleBody } from '@/components/articles/ArticleBody';
import { CoverImage } from '@/components/articles/CoverImage';
import { ListenButton } from '@/components/articles/ListenButton';
import { ReadingThemeToggle } from '@/components/articles/ReadingTheme';
import { TableOfContents } from '@/components/articles/TableOfContents';
import { getArticle } from '@/lib/articles/queries';
import { articlePath, readingMinutes } from '@/lib/core/articles.core';
import { topicLabel } from '@/lib/core/covers.core';
import { formatLongDate } from '@/lib/core/format.core';
import { resolveSiteUrl } from '@/lib/core/site.core';
import { articleHeadings, speechChunks } from '@/lib/core/speech.core';

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
 *
 * A diagramação muda com a tela, a pedido do Kauã:
 * - celular: uma coluna estreita, capa em cima, ações logo abaixo do título;
 * - tablet e notebook: a mesma coluna, mais larga, com a capa ao lado do título;
 * - desktop largo (xl): três faixas. Sumário com progresso à esquerda, texto no
 *   meio, e à direita ações, fontes e o Circle, fixos enquanto se lê. As
 *   laterais deixam de ser vazio e viram navegação.
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

function CircleInvite({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={`border border-[var(--border)] bg-[var(--bg-card)] ${compact ? 'px-5 py-6' : 'px-6 py-8 sm:px-8'}`}
    >
      <p className="eyebrow">W&amp;W Circle</p>
      <p className={`${compact ? 'card-title' : 'section-title'} mt-4`}>
        Uma hora por semana, ao vivo, sobre o que os seus dados estão dizendo.
      </p>
      <p className="prose-body mt-4 text-sm">
        Os artigos são abertos. O encontro de quinta, as gravações e a biblioteca são de quem
        assina.
      </p>
      <div className="mt-6">
        <Button href="/circle" variant="primary">
          Conhecer o Circle
        </Button>
      </div>
    </aside>
  );
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await load(slug);
  if (!article) notFound();

  const site = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });

  const headings = articleHeadings(article.body_md);
  const chunks = speechChunks(article.title, article.dek, article.body_md);
  const minutes = readingMinutes(article.body_md);

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
    <article className="w-full pb-20">
      <script
        type="application/ld+json"
        // `<` escapado: título e linha fina vêm de um modelo, e um
        // `</script>` dentro deles fecharia esta tag no meio do JSON.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Abertura: capa em cima no celular, ao lado do título a partir do notebook. */}
      <header className="container-lp pt-8 md:pt-12">
        <Link
          href="/circle/artigos"
          className="inline-flex min-h-11 items-center gap-2 border border-[var(--border)] px-4 text-[11px] uppercase tracking-[0.16em] text-[var(--text-2)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
        >
          <span aria-hidden="true">&larr;</span> Todos os artigos
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14">
          <div className="article-cover order-first aspect-[16/9] overflow-hidden border border-[var(--border)] lg:order-last">
            <CoverImage article={article} priority sizes="(min-width: 1024px) 52vw, 100vw" />
          </div>

          <div>
            <p className="eyebrow">W&amp;W Circle · {topicLabel(article.topic)}</p>
            <h1 className="page-title mt-4">{article.title}</h1>
            <p className="lede mt-6">{article.dek}</p>
            <p className="meta mt-7">
              Kauã Ramos · {formatLongDate(article.published_at)} · {minutes} min de leitura
            </p>
          </div>
        </div>
      </header>

      {/* Ações no celular, tablet e notebook. No desktop largo elas moram na coluna direita. */}
      <div className="container-lp mt-8 flex flex-wrap items-center gap-3 border-y border-[var(--border)] py-4 xl:hidden">
        <ListenButton chunks={chunks} />
        <ReadingThemeToggle />
      </div>

      <div className="container-lp mt-10 xl:mt-16 xl:grid xl:grid-cols-[13rem_minmax(0,1fr)_17rem] xl:gap-12 2xl:gap-16">
        <div className="hidden xl:block">
          <div className="sticky top-24">
            <TableOfContents headings={headings} />
          </div>
        </div>

        <div id="corpo-do-artigo" className="mx-auto w-full max-w-[72ch] xl:mx-0">
          <ArticleBody markdown={article.body_md} />

          {article.sources.length > 0 && (
            <section className="mt-16 border-t border-[var(--border)] pt-10" aria-labelledby="fontes">
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

          <p className="prose-body mt-12 border-l border-[var(--border)] pl-5 text-sm">
            Este texto é orientação de hábito, feita a partir de estudos publicados. Ele não substitui
            avaliação médica, e não serve para diagnosticar nem para mudar tratamento ou medicação. Se
            algo aqui conversa com um sintoma seu, leve a pergunta a quem te acompanha.
          </p>

          {/* Um convite só por página: no desktop largo ele está na coluna direita. */}
          <div className="mt-16 xl:hidden">
            <CircleInvite />
          </div>
        </div>

        <div className="hidden xl:block">
          <div className="sticky top-24 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <ListenButton chunks={chunks} />
              <ReadingThemeToggle />
            </div>
            <div className="border-t border-[var(--border)] pt-6">
              <p className="meta">Baseado em</p>
              <p className="card-title mt-2">
                {article.sources.length} {article.sources.length === 1 ? 'estudo' : 'estudos'}
              </p>
              <a
                href="#fontes"
                className="mt-3 inline-flex text-[11px] uppercase tracking-[0.16em] text-[var(--text-3)] underline underline-offset-4 transition hover:text-[var(--accent)]"
              >
                Ver as fontes
              </a>
            </div>
            <CircleInvite compact />
          </div>
        </div>
      </div>
    </article>
  );
}
