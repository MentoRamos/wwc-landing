import { listPodcastRows, podcastObjectSizes } from '@/lib/articles/queries';
import { feedIsServable, podcastEpisodes, podcastShow, rssFeed } from '@/lib/core/podcast.core';
import { resolveSiteUrl } from '@/lib/core/site.core';
import { publicSupabaseEnv } from '@/lib/supabase/env';

/**
 * `/circle/podcast/rss.xml` — o feed que o Spotify, o Apple Podcasts e o
 * YouTube Music leem.
 *
 * Esta URL é o endereço do show: depois de reivindicado, o Spotify volta aqui
 * sozinho e publica o que apareceu. Trocar o caminho depois de reivindicar
 * quebra o canal, então ele mora numa constante
 * (`PODCAST_FEED_PATH`) e não em texto solto.
 *
 * `force-dynamic` pelo mesmo motivo do sitemap: cacheado no build, o feed
 * nunca mostraria o episódio que o cron publicou hoje — que é justamente o
 * ponto do canal.
 */
export const dynamic = 'force-dynamic';

/**
 * Fora do ar por agora, sem cache: 503 com `Retry-After` é o que faz o
 * Spotify voltar mais tarde mantendo os episódios. Um 200 vazio, cacheado na
 * borda por até uma hora, faria ele apagar o show.
 */
function unavailable(): Response {
  return new Response('feed temporariamente indisponível', {
    status: 503,
    headers: { 'retry-after': '600', 'cache-control': 'no-store' },
  });
}

export async function GET() {
  const base = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });

  const show = podcastShow(base, { PODCAST_OWNER_EMAIL: process.env.PODCAST_OWNER_EMAIL });
  let rows;
  try {
    rows = await listPodcastRows();
  } catch {
    return unavailable();
  }
  const episodes = podcastEpisodes(rows, publicSupabaseEnv().url, base);
  // Banco respondeu, mas sem nenhum episódio tocável: também é falha, nunca o
  // estado real do show. Ver feedIsServable.
  if (!feedIsServable(episodes)) return unavailable();
  // o tamanho real do arquivo, não a estimativa por bitrate: ver podcastObjectSizes
  const body = rssFeed(show, episodes, { bytesBySlug: await podcastObjectSizes(rows) });

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      // Cinco minutos de borda: o Spotify e o Apple batem aqui várias vezes
      // por dia e o conteúdo só muda uma vez. `stale-while-revalidate` evita
      // que o primeiro leitor depois da publicação espere o banco.
      'cache-control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
