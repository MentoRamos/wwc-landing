import type { MetadataRoute } from 'next';
import { listArticles } from '@/lib/articles/queries';
import { articlePath } from '@/lib/core/articles.core';
import { resolveSiteUrl } from '@/lib/core/site.core';

/**
 * `/circle/artigos/sitemap.xml`, separado do sitemap raiz de propósito.
 *
 * O `sitemap.xml` do apex `kauaramos.com` é do site estático, não desta
 * plataforma. Este aqui chega pelo rewrite `/circle/:path*`, e o `robots.txt`
 * do estático aponta para ele numa linha `Sitemap:`.
 *
 * Dinâmico porque metadata route é cacheada no build por padrão: um sitemap
 * congelado no deploy nunca listaria o artigo que o cron publicou hoje.
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });
  const articles = await listArticles();

  return [
    {
      url: `${base}/circle/artigos`,
      lastModified: articles[0]?.published_at ? new Date(articles[0].published_at) : new Date(),
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: `${base}${articlePath(article.slug)}`,
      lastModified: new Date(article.published_at),
      priority: 0.6,
    })),
  ];
}
