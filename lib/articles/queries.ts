import { adminClient } from '@/lib/supabase/admin';
import { publicClient } from '@/lib/supabase/public';
import type { ArticleSource } from '@/lib/core/articles.core';
import { AUDIO_BUCKET } from '@/lib/core/audio.core';
import type { PodcastRow } from '@/lib/core/podcast.core';

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
  cover_key: string | null;
  published_at: string;
};

export type Article = ArticleSummary & {
  body_md: string;
  sources: ArticleSource[];
  updated_at: string;
  // O episódio do artigo no bucket público, e a duração só para a tela. Nulo
  // nos artigos de antes de 05/10: aí a página cai na voz do aparelho.
  audio_path: string | null;
  audio_seconds: number | null;
};

const SUMMARY = 'slug, title, dek, topic, cover_key, published_at';

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
    .select(`${SUMMARY}, body_md, sources, updated_at, audio_path, audio_seconds`)
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

/**
 * As linhas que viram episódio no feed de podcast.
 *
 * Pede `audio_path` não nulo no banco em vez de filtrar depois: sem isso, uma
 * sequência de artigos sem áudio gastaria o limite da consulta com linhas que
 * o feed ia descartar. Quem decide o que é tocável é o `podcastEpisodes`, que
 * corta o que não é MP3.
 *
 * O teto de 300 existe porque feed de podcast não pagina: um dia isso vira
 * janela deslizante, e aí o episódio mais velho sai do ar nos agregadores. A
 * um artigo por dia, dá dez meses para resolver.
 */
export async function listPodcastRows(limit = 300): Promise<PodcastRow[]> {
  const { data, error } = await publicClient()
    .from('articles')
    .select('slug, title, dek, published_at, audio_path, audio_seconds')
    .not('audio_path', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Feed vazio é melhor que 500: o Spotify repete a busca, e 500 repetido é
    // o que faz ele marcar o feed como quebrado.
    console.error('[podcast] listagem falhou', { code: error.code });
    return [];
  }
  return (data ?? []) as PodcastRow[];
}

/**
 * O tamanho REAL de cada episódio, por slug, para o `length` do enclosure.
 *
 * O feed estimava por bitrate (64 kbps × duração) e errava por alguns KB em
 * todo episódio. O Apple pede o tamanho do arquivo e um player que confia no
 * número mostra progresso errado, então estimativa é defeito, não detalhe.
 *
 * Uma chamada só: `list` do bucket devolve o tamanho de todos os objetos de
 * uma vez. Falhar aqui não é fatal — o feed volta para a estimativa, que é
 * pior que o número certo e muito melhor que um feed fora do ar.
 */
export async function podcastObjectSizes(rows: PodcastRow[]): Promise<Record<string, number>> {
  const paths = new Map(rows.filter((r) => r.audio_path).map((r) => [r.audio_path as string, r.slug]));
  if (!paths.size) return {};
  const { data, error } = await adminClient().storage.from(AUDIO_BUCKET).list('', { limit: 1000 });
  if (error || !data) {
    console.error('[podcast] tamanho dos objetos indisponível', { message: error?.message });
    return {};
  }
  const out: Record<string, number> = {};
  for (const obj of data) {
    const slug = paths.get(obj.name);
    const size = (obj.metadata as { size?: number } | null)?.size;
    if (slug && typeof size === 'number' && size > 0) out[slug] = size;
  }
  return out;
}
