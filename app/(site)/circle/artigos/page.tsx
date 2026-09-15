import type { Metadata } from 'next';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ArticleList } from '@/components/articles/ArticleList';
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
 */
export default async function ArticlesIndexPage() {
  const articles = await listArticles();

  return (
    <div className="container-lp w-full py-16">
      <SectionHeading
        eyebrow="W&W Circle · Artigos"
        title={
          <>
            O estudo lido, <em className="accent-word">para você não precisar</em>.
          </>
        }
        lede={DESCRIPTION}
      />
      <div className="rule-gold mt-7" aria-hidden="true" />

      <div className="mt-14">
        {articles.length > 0 ? (
          <ArticleList articles={articles} />
        ) : (
          <p className="prose-body">O primeiro artigo sai amanhã, às 10h.</p>
        )}
      </div>
    </div>
  );
}
