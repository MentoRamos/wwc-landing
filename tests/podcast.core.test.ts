import { describe, expect, it } from 'vitest';
import {
  PODCAST_FEED_PATH,
  episodeGuid,
  escapeXml,
  podcastEpisodes,
  podcastShow,
  podcastSpotifyUrl,
  rfc2822,
  rssFeed,
  type PodcastRow,
} from '@/lib/core/podcast.core';

const SUPABASE = 'https://projeto.supabase.co';
const BASE = 'https://kauaramos.com';

function row(overrides: Partial<PodcastRow> = {}): PodcastRow {
  return {
    slug: 'condicionamento-pesa-mais-que-o-imc',
    title: 'Condicionamento pesa mais que o IMC',
    dek: 'Em 20 estudos, quem estava condicionado não teve risco maior.',
    published_at: '2026-10-09T13:00:00.000Z',
    audio_path: 'condicionamento-pesa-mais-que-o-imc-644c1d43.mp3',
    audio_seconds: 618,
    ...overrides,
  };
}

describe('podcastEpisodes', () => {
  it('monta a URL pública do bucket e o link do artigo', () => {
    const [episode] = podcastEpisodes([row()], SUPABASE, BASE);
    expect(episode.audioUrl).toBe(
      `${SUPABASE}/storage/v1/object/public/article-audio/condicionamento-pesa-mais-que-o-imc-644c1d43.mp3`,
    );
    expect(episode.articleUrl).toBe(`${BASE}/circle/artigos/condicionamento-pesa-mais-que-o-imc`);
  });

  it('deixa o ogg FORA: o Spotify e o Apple não ingerem Ogg', () => {
    const rows = [row({ audio_path: 'artigo-abc12345.ogg' }), row()];
    expect(podcastEpisodes(rows, SUPABASE, BASE)).toHaveLength(1);
  });

  it('ignora linha sem áudio', () => {
    expect(podcastEpisodes([row({ audio_path: null })], SUPABASE, BASE)).toEqual([]);
  });

  it('não se perde com barra sobrando na base nem no supabase', () => {
    const [episode] = podcastEpisodes([row()], `${SUPABASE}/`, `${BASE}/`);
    expect(episode.audioUrl).not.toContain('//storage');
    expect(episode.articleUrl).toBe(`${BASE}/circle/artigos/condicionamento-pesa-mais-que-o-imc`);
  });
});

describe('episodeGuid', () => {
  it('depende do slug, nunca do arquivo', () => {
    // Re-subir o áudio troca a impressão digital no nome do objeto. Se o GUID
    // acompanhasse isso, o Spotify publicaria o mesmo episódio duas vezes.
    const antes = podcastEpisodes([row()], SUPABASE, BASE)[0];
    const depois = podcastEpisodes(
      [row({ audio_path: 'condicionamento-pesa-mais-que-o-imc-ffffffff.mp3' })],
      SUPABASE,
      BASE,
    )[0];
    expect(episodeGuid(antes.slug)).toBe(episodeGuid(depois.slug));
  });
});

describe('escapeXml', () => {
  it('escapa o & antes do resto, senão escapa o próprio escape', () => {
    expect(escapeXml('Saúde & "treino" <b>')).toBe('Saúde &amp; &quot;treino&quot; &lt;b&gt;');
  });
});

describe('rfc2822', () => {
  it('é o formato que pubDate exige', () => {
    expect(rfc2822(new Date('2026-10-09T13:00:00.000Z'))).toBe('Fri, 09 Oct 2026 13:00:00 +0000');
  });
});

describe('rssFeed', () => {
  const show = podcastShow(BASE, { PODCAST_OWNER_EMAIL: 'podcast@exemplo.com' });
  const feed = rssFeed(show, podcastEpisodes([row()], SUPABASE, BASE));

  it('abre com a declaração XML na primeira linha', () => {
    expect(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('declara o namespace do itunes', () => {
    expect(feed).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
  });

  it('traz o que o Spotify exige no canal', () => {
    expect(feed).toContain('<itunes:image href="https://kauaramos.com/podcast-capa.jpg" />');
    expect(feed).toContain('<itunes:category text="Health &amp; Fitness">');
    expect(feed).toContain('<language>pt-BR</language>');
    expect(feed).toContain('<itunes:explicit>false</itunes:explicit>');
  });

  it('aponta para si mesmo no caminho que o Spotify guarda', () => {
    expect(feed).toContain(`href="${BASE}${PODCAST_FEED_PATH}" rel="self"`);
  });

  it('leva o e-mail do dono, que é o que permite reivindicar o show', () => {
    expect(feed).toContain('<itunes:email>podcast@exemplo.com</itunes:email>');
  });

  it('omite o bloco do dono quando não há e-mail, em vez de mandar vazio', () => {
    const sem = rssFeed(
      { ...podcastShow(BASE), ownerEmail: '' },
      podcastEpisodes([row()], SUPABASE, BASE),
    );
    expect(sem).not.toContain('<itunes:owner>');
    expect(sem).toContain('<item>');
  });

  it('cada item tem enclosure com url, length e type, e GUID estável', () => {
    expect(feed).toContain('type="audio/mpeg"');
    expect(feed).toContain('<guid isPermaLink="false">ww-artigo-condicionamento-pesa-mais-que-o-imc</guid>');
    expect(feed).toMatch(/length="\d+"/);
    expect(feed).not.toMatch(/length="0"/);
  });

  it('usa o tamanho real quando ele é conhecido', () => {
    const exato = rssFeed(show, podcastEpisodes([row()], SUPABASE, BASE), {
      bytesBySlug: { 'condicionamento-pesa-mais-que-o-imc': 4_915_200 },
    });
    expect(exato).toContain('length="4915200"');
  });

  it('declara a duração em segundos', () => {
    expect(feed).toContain('<itunes:duration>618</itunes:duration>');
  });

  it('põe o link do artigo na descrição, que é a ponte Spotify -> site', () => {
    expect(feed).toContain(`${BASE}/circle/artigos/condicionamento-pesa-mais-que-o-imc`);
  });

  it('escapa o título do episódio', () => {
    const bravo = rssFeed(
      show,
      podcastEpisodes([row({ title: 'Jejum & "reposição"' })], SUPABASE, BASE),
    );
    expect(bravo).toContain('<title>Jejum &amp; &quot;reposição&quot;</title>');
  });

  it('não quebra sem nenhum episódio', () => {
    const vazio = rssFeed(show, []);
    expect(vazio).toContain('<channel>');
    expect(vazio).not.toContain('<item>');
  });
});

describe('o dono do feed', () => {
  it('é o endereço que recebe o código de 8 dígitos do Spotify', () => {
    // Trocar isto depois de o show ser reivindicado não muda o dono no
    // Spotify, só no feed. Por isso o valor está no teste: mudança aqui é
    // decisão, não detalhe. E é um alias, não a caixa pessoal, porque o feed
    // é público.
    expect(podcastShow(BASE).ownerEmail).toBe('podcast@kauaramos.com');
  });
});

describe('podcastSpotifyUrl', () => {
  it('só aceita endereço do próprio Spotify', () => {
    expect(podcastSpotifyUrl({ PODCAST_SPOTIFY_SHOW_URL: 'https://open.spotify.com/show/abc' })).toBe(
      'https://open.spotify.com/show/abc',
    );
    expect(podcastSpotifyUrl({ PODCAST_SPOTIFY_SHOW_URL: 'https://exemplo.com/show' })).toBeNull();
  });

  it('sem canal, não há link: botão que leva a lugar nenhum é pior que botão nenhum', () => {
    expect(podcastSpotifyUrl()).toBeNull();
    expect(podcastSpotifyUrl({ PODCAST_SPOTIFY_SHOW_URL: '  ' })).toBeNull();
  });
});
