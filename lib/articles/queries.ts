import { publicClient } from '@/lib/supabase/public';
import type { ArticleSource } from '@/lib/core/articles.core';

/**
 * As leituras públicas dos artigos. A política `articles_public_read` decide
 * o que volta (publicado, não escondido); nada aqui filtra por conta própria,
 * para que a regra more num lugar só.
 */

export type ArticleSummary = {
  slug: string;
  title: string;
  dek: string;
  topic: string | null;
  published_at: string;
};

export type Article = ArticleSummary & {
  body_md: string;
  sources: ArticleSource[];
  updated_at: string;
};

const SUMMARY = 'slug, title, dek, topic, published_at';

export async function listArticles(limit?: number): Promise<ArticleSummary[]> {
  let query = publicClient()
    .from('articles')
    .select(SUMMARY)
    .order('published_at', { ascending: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    // Uma lista vazia é melhor que uma página de erro no /circle, que vende.
    console.error('[artigos] listagem falhou', { code: error.code });
    return [];
  }
  return (data ?? []) as ArticleSummary[];
}

export async function getArticle(slug: string): Promise<Article | null> {
  // Slug que nem tem o formato não vai ao banco.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 90) return null;

  const { data, error } = await publicClient()
    .from('articles')
    .select(`${SUMMARY}, body_md, sources, updated_at`)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[artigos] leitura falhou', { code: error.code });
    throw new Error('artigo indisponível');
  }
  if (!data) return null;

  // O endpoint valida a forma de cada fonte, mas a coluna é jsonb: um item
  // torto que entre por fora (psql, conserto na mão) derrubaria a página
  // inteira com 500. Descarta o item, não o artigo.
  const sources = (Array.isArray(data.sources) ? data.sources : []).filter(
    (item): item is ArticleSource =>
      typeof item?.label === 'string' &&
      typeof item?.url === 'string' &&
      item.url.startsWith('https://'),
  );
  return { ...(data as Omit<Article, 'sources'>), sources };
}
