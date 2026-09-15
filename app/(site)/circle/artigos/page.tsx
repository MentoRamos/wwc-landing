import type { Metadata } from 'next';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ArticleGrid, FeaturedArticleCard } from '@/components/articles/ArticleCards';
import { ReadingThemeToggle } from '@/components/articles/ReadingTheme';
import { listArticles } from '@/lib/articles/queries';

const DESCRIPTION =
  'Um tema de saúde, performance ou longevidade por dia, lido na fonte primária e escrito para quem não tem tempo de ler o estudo.';

export const metadata: Metadata = {
  title: 'Artigos · W&W Circle',
  description: DESCRIPTION,
  alternates: { canonical: '/circle/artigos' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/circle/artigos',
    siteName: 'Wealth & Wellness',
    title: 'Artigos do W&W Circle',
    description: DESCRIPTION,
  },
};

/**
 * O índice. Um artigo novo entra todo dia às 10h pelo cron do servidor, e
 * esta página lê a cada request: não há cache para invalidar, e o layout
 * público já é dinâmico (ele pergunta quem está logado).
 *
 * O mais recente abre em destaque, largura toda, capa ao lado do texto no
 * desktop; o resto vem em grade de 3 colunas no desktop, 2 no tablet e 1 no
 * celular. É a diferença entre uma revista e uma lista de links.
 */
export default async function ArticlesIndexPage() {
  const articles = await listArticles();
  const [latest, ...rest] = articles;

  return (
    <div className="container-lp w-full py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="W&W Circle · Artigos"
          title={
            <>
              O estudo lido, <em className="accent-word">para você não precisar</em>.
            </>
          }
          lede={DESCRIPTION}
        />
        <ReadingThemeToggle />
      </div>
      <div className="rule-gold mt-7" aria-hidden="true" />

      <div className="mt-12">
        {latest ? (
          <>
            <FeaturedArticleCard article={latest} />
            {rest.length > 0 && (
              <div className="mt-6">
                <ArticleGrid articles={rest} />
              </div>
            )}
          </>
        ) : (
          <p className="prose-body">O primeiro artigo sai amanhã, às 10h.</p>
        )}
      </div>
    </div>
  );
}
