/**
 * O feed de podcast do Wealth & Wellness: o mesmo áudio que a página do artigo
 * toca, embrulhado em RSS 2.0 para o Spotify, o Apple Podcasts e quem mais
 * ler feed.
 *
 * Por que RSS e não upload: o Spotify não exige hospedar com ele. O fluxo de
 * "claim" aceita a URL de um feed de qualquer host e passa a buscar episódio
 * novo sozinho, em minutos. Como o áudio do artigo já mora numa URL pública do
 * bucket e o banco já guarda título, resumo, data e duração, publicar no
 * Spotify deixa de ser um passo manual por dia e vira uma rota.
 *
 * Tudo aqui é função pura, sem rede e sem Supabase, pelo mesmo motivo do
 * `audio.core.ts`: o que o leitor de podcast vê precisa ser decidido num lugar
 * só, e um XML montado na mão dentro da rota é um erro de escape esperando a
 * primeira aspas num título.
 */

import { AUDIO_BUCKET } from './audio.core';

/** Onde o feed responde. O Spotify guarda esta URL e volta nela todo dia. */
export const PODCAST_FEED_PATH = '/circle/podcast/rss.xml';

/**
 * O e-mail do dono do feed, que é o que permite reivindicar o show.
 *
 * O Spotify manda um código de 8 dígitos para o endereço que está AQUI, de
 * `noreply@hello.creators.spotify.com`. Sem ele o feed continua válido para
 * quem lê, mas ninguém consegue provar que o show é nosso.
 *
 * Mora no código, e não só em variável de ambiente, porque trocar isto não
 * pode depender de acesso ao painel da Vercel. O ambiente ainda ganha, para o
 * caso de precisar trocar sem deploy.
 *
 * É um ALIAS, e não a caixa pessoal, porque o endereço sai público dentro do
 * feed: todo leitor de RSS e todo robô que varre feed consegue colher. O alias
 * precisa entregar numa caixa que o Kauã leia ANTES de reivindicar o show,
 * senão o código de 8 dígitos cai no vazio.
 */
export const PODCAST_OWNER_EMAIL_FALLBACK = 'podcast@kauaramos.com';

/**
 * O endereço do canal no Spotify, para o link ao lado do player.
 *
 * Fica vazio até o show ser reivindicado, e vazio significa que o link não
 * aparece — botão que leva a lugar nenhum é pior que botão que não existe.
 *
 * É o CANAL, não o episódio: a URL do episódio só nasce depois de o Spotify
 * ingerir o feed, horas depois de a página estar no ar, e resolver isso pede a
 * API do Spotify. O link do canal custa zero e já entrega a ponte nos dois
 * sentidos.
 */
export const PODCAST_SPOTIFY_SHOW_URL_FALLBACK = '';

export function podcastSpotifyUrl(env: { PODCAST_SPOTIFY_SHOW_URL?: string } = {}): string | null {
  const url = (env.PODCAST_SPOTIFY_SHOW_URL ?? '').trim() || PODCAST_SPOTIFY_SHOW_URL_FALLBACK;
  return url.startsWith('https://open.spotify.com/') ? url : null;
}

/**
 * O título leva palavra-chave em português porque a busca do Spotify pesa o
 * título acima de tudo, e "Wealth & Wellness" sozinho não é o que alguém
 * digita procurando saúde. Aprovado pelo Kauã em 09/10/2026.
 */
const SHOW_TITLE = 'Wealth & Wellness: saúde e longevidade com ciência';
const SHOW_AUTHOR = 'Kauã Ramos';

/**
 * A descrição do show, aprovada pelo Kauã em 09/10/2026.
 *
 * Diz com todas as letras que vozes E roteiro são de IA: o roteiro sai do
 * cron sem revisão humana antes de ir ao ar, então "os textos são do Kauã"
 * seria falso. O que é dele é a curadoria. E é conteúdo de saúde, então o
 * aviso de que não substitui consulta vai no show e em todo episódio.
 */
const SHOW_DESCRIPTION = [
  'Saúde, longevidade, treino, sono e nutrição explicados a partir de estudos científicos, um por episódio:',
  'o número que o estudo mostrou e o que dá pra fazer com isso na sua semana, sem promessa milagrosa.',
  'Rafa e Dani são apresentadores com vozes geradas por inteligência artificial;',
  'os roteiros são produzidos com IA a partir dos artigos do Wealth & Wellness Circle, com curadoria de Kauã Ramos.',
  'Conteúdo informativo: não substitui consulta com médico ou nutricionista.',
  'Artigo completo, com as fontes, no link de cada episódio.',
].join(' ');

/** O rodapé de todo episódio: o mesmo aviso do show, curto. */
const EPISODE_DISCLAIMER =
  'Rafa e Dani são vozes geradas por inteligência artificial; roteiro produzido com IA a partir do artigo, com curadoria de Kauã Ramos. ' +
  'Conteúdo informativo: não substitui consulta com médico ou nutricionista.';

/**
 * O identificador do show no Podcasting 2.0: UUIDv5 do endereço do feed sem
 * protocolo, no namespace oficial `ead4c236-bf58-58c6-a2c6-a0b28c128cb6`.
 * Calculado uma vez e fixado — derivar de novo a cada pedido arriscaria
 * trocar o id do show se a base mudasse.
 */
export const PODCAST_GUID = '6eb447bc-17fa-5c32-8ee4-4781ab862702';

export type PodcastShow = {
  title: string;
  /** A página de venda do Circle, para o convite no fim de cada episódio. */
  circleUrl: string;
  description: string;
  author: string;
  ownerEmail: string;
  language: string;
  explicit: boolean;
  coverUrl: string;
  /** Para onde o `<link>` do canal aponta: a lista de artigos. */
  siteUrl: string;
  feedUrl: string;
};

/** A linha do banco que vira episódio. */
export type PodcastRow = {
  slug: string;
  title: string;
  dek: string;
  published_at: string;
  audio_path: string | null;
  audio_seconds: number | null;
};

export type PodcastEpisode = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  audioUrl: string;
  seconds: number | null;
  articleUrl: string;
};

export function podcastShow(
  base: string,
  env: { PODCAST_OWNER_EMAIL?: string } = {},
): PodcastShow {
  const origin = base.replace(/\/+$/, '');
  return {
    title: SHOW_TITLE,
    circleUrl: `${origin}/circle`,
    description: SHOW_DESCRIPTION,
    author: SHOW_AUTHOR,
    ownerEmail: (env.PODCAST_OWNER_EMAIL ?? '').trim() || PODCAST_OWNER_EMAIL_FALLBACK,
    language: 'pt-BR',
    explicit: false,
    coverUrl: `${origin}/podcast-capa.jpg`,
    siteUrl: `${origin}/circle/artigos`,
    feedUrl: `${origin}${PODCAST_FEED_PATH}`,
  };
}

/**
 * O GUID do episódio, que nunca muda.
 *
 * É derivado do SLUG, nunca do nome do arquivo. O nome do objeto carrega a
 * impressão digital do conteúdo, então re-subir o áudio do mesmo artigo troca
 * o caminho — e um GUID que acompanhasse o arquivo faria o Spotify publicar o
 * mesmo episódio duas vezes, com o antigo pendurado para sempre.
 */
export function episodeGuid(slug: string): string {
  return `ww-artigo-${slug}`;
}

/**
 * Os episódios que podem entrar no feed, dos mais novos para os mais velhos.
 *
 * 🔴 Só MP3. O Spotify e o Apple tocam MP3, M4A e WAV; Ogg/Opus eles não
 * ingerem. O áudio do site nasceu em .ogg, então artigo que ainda não teve o
 * MP3 publicado fica FORA do feed de propósito: episódio que o app não
 * consegue tocar é pior que episódio que não existe — o primeiro vira
 * reclamação de ouvinte, o segundo ninguém nota.
 */
export function podcastEpisodes(
  rows: PodcastRow[],
  supabaseUrl: string,
  base: string,
): PodcastEpisode[] {
  const origin = base.replace(/\/+$/, '');
  const storage = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${AUDIO_BUCKET}`;

  return rows
    .filter((row) => !!row.audio_path && row.audio_path.toLowerCase().endsWith('.mp3'))
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      summary: row.dek,
      publishedAt: row.published_at,
      audioUrl: `${storage}/${row.audio_path}`,
      seconds: row.audio_seconds,
      articleUrl: `${origin}/circle/artigos/${row.slug}`,
    }));
}

/**
 * Escape de XML. `&` primeiro, senão ele escapa o próprio escape.
 *
 * Também tira os caracteres de controle que XML 1.0 proíbe: título e resumo
 * vêm do LLM, e um único desses derruba o feed INTEIRO no leitor, não só o
 * episódio. Tab, quebra de linha e retorno ficam.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RFC 2822, que é o formato que `<pubDate>` exige. */
export function rfc2822(date: Date): string {
  return date.toUTCString().replace('GMT', '+0000');
}

/** Liga o link à origem: sem isto, visita vinda do Spotify parece orgânica. */
function fromSpotify(url: string, campaign: string): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'spotify');
  u.searchParams.set('utm_medium', 'podcast');
  u.searchParams.set('utm_campaign', campaign);
  return u.toString();
}

/**
 * A descrição do episódio, em HTML.
 *
 * É aqui que mora a ponte Spotify → site. O link do artigo vem PRIMEIRO
 * porque o app mostra só as primeiras linhas antes do "mais", e resumo de 250
 * caracteres empurrava o link para baixo da dobra. Depois o resumo, o convite
 * pro Circle e o aviso de IA e saúde.
 *
 * HTML com `<a href>` e não URL solta: o Apple só torna clicável o que é
 * âncora, e não há garantia de que o Spotify converta texto em link.
 */
export function episodeDescription(episode: PodcastEpisode, show: PodcastShow): string {
  const article = fromSpotify(episode.articleUrl, episode.slug);
  const circle = fromSpotify(show.circleUrl, episode.slug);
  return [
    `<p>Artigo completo, com as fontes: <a href="${escapeXml(article)}">${escapeXml(episode.articleUrl)}</a></p>`,
    `<p>${escapeXml(episode.summary)}</p>`,
    `<p>Quer aplicar isso no seu caso? Conheça o Wealth &amp; Wellness Circle: <a href="${escapeXml(circle)}">${escapeXml(show.circleUrl)}</a></p>`,
    `<p>${escapeXml(EPISODE_DISCLAIMER)}</p>`,
  ].join('');
}

/** A mesma descrição em texto puro, para o `itunes:summary`, que não aceita HTML. */
export function episodeSummaryText(episode: PodcastEpisode): string {
  return `Artigo completo: ${episode.articleUrl}\n\n${episode.summary}\n\n${EPISODE_DISCLAIMER}`;
}

/**
 * Se o feed pode ir ao ar.
 *
 * Feed válido com zero episódio diz ao Spotify que todos foram apagados, e
 * ele tira do app. Lista vazia aqui é sempre falha (banco fora, consulta
 * quebrada), nunca o estado real do show — então a rota responde 503 e o
 * agregador tenta de novo mais tarde, com os episódios que já tem.
 */
export function feedIsServable(episodes: PodcastEpisode[]): boolean {
  return episodes.length > 0;
}

/**
 * O feed inteiro.
 *
 * O que o Spotify recusa e por isso está aqui: declaração XML na primeira
 * linha, namespace do itunes, capa quadrada, categoria, idioma, `explicit`, e
 * em cada item um `<enclosure>` com url, length e type mais um GUID estável.
 * `length` é o tamanho em bytes quando se sabe; zero não é aceito, então sem
 * tamanho o atributo sai com o que der para estimar pela duração.
 */
export function rssFeed(
  show: PodcastShow,
  episodes: PodcastEpisode[],
  options: { bytesBySlug?: Record<string, number>; now?: Date } = {},
): string {
  const now = options.now ?? new Date();
  const bytes = options.bytesBySlug ?? {};

  const owner = show.ownerEmail
    ? `
    <itunes:owner>
      <itunes:name>${escapeXml(show.author)}</itunes:name>
      <itunes:email>${escapeXml(show.ownerEmail)}</itunes:email>
    </itunes:owner>`
    : '';

  const items = episodes
    .map((episode) => {
      // Sem o tamanho real do objeto, estima por 64 kbps, que é o bitrate em
      // que o MP3 do episódio é publicado. O leitor usa isso para a barra de
      // progresso antes do primeiro byte; errar por pouco não quebra nada,
      // mandar zero quebra.
      const length = bytes[episode.slug] ?? Math.max(1, Math.round((episode.seconds ?? 600) * 8000));
      const duration = episode.seconds ? `
      <itunes:duration>${episode.seconds}</itunes:duration>` : '';

      return `    <item>
      <title>${escapeXml(episode.title)}</title>
      <link>${escapeXml(episode.articleUrl)}</link>
      <guid isPermaLink="false">${escapeXml(episodeGuid(episode.slug))}</guid>
      <pubDate>${rfc2822(new Date(episode.publishedAt))}</pubDate>
      <description>${escapeXml(episodeDescription(episode, show))}</description>
      <content:encoded>${escapeXml(episodeDescription(episode, show))}</content:encoded>
      <itunes:summary>${escapeXml(episodeSummaryText(episode))}</itunes:summary>
      <itunes:author>${escapeXml(show.author)}</itunes:author>
      <itunes:explicit>false</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>${duration}
      <enclosure url="${escapeXml(episode.audioUrl)}" length="${length}" type="audio/mpeg" />
    </item>`;
    })
    .join('\n');

  const latest = episodes[0]?.publishedAt ? new Date(episodes[0].publishedAt) : now;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>${escapeXml(show.title)}</title>
    <link>${escapeXml(show.siteUrl)}</link>
    <atom:link href="${escapeXml(show.feedUrl)}" rel="self" type="application/rss+xml" />
    <language>${show.language}</language>
    <description>${escapeXml(show.description)}</description>
    <itunes:summary>${escapeXml(show.description)}</itunes:summary>
    <itunes:author>${escapeXml(show.author)}</itunes:author>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>${show.explicit}</itunes:explicit>
    <itunes:image href="${escapeXml(show.coverUrl)}" />
    <image>
      <url>${escapeXml(show.coverUrl)}</url>
      <title>${escapeXml(show.title)}</title>
      <link>${escapeXml(show.siteUrl)}</link>
    </image>
    <itunes:category text="Health &amp; Fitness">
      <itunes:category text="Fitness" />
      <itunes:category text="Nutrition" />
    </itunes:category>
    <itunes:category text="Science" />${owner}
    <copyright>© ${now.getUTCFullYear()} ${escapeXml(show.author)}</copyright>
    <podcast:guid>${PODCAST_GUID}</podcast:guid>${show.ownerEmail ? `
    <podcast:locked owner="${escapeXml(show.ownerEmail)}">yes</podcast:locked>` : ''}
    <lastBuildDate>${rfc2822(latest)}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
