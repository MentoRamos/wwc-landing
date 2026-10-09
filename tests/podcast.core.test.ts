import { describe, expect, it } from 'vitest';
import {
  PODCAST_FEED_PATH,
  episodeGuid,
  escapeXml,
  podcastEpisodes,
  podcastShow,
  podcastSpotifyUrl,
  feedIsServable,
  podcastRefs,
  rfc2822,
  rssFeed,
  episodeDescription,
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

// O `length` do enclosure é o tamanho do arquivo, e a estimativa por bitrate
// errava por alguns KB em todo episódio: o Apple pede o tamanho real e um
// player que confia no número mostra progresso errado.
describe('bytesBySlug', () => {
  it('usa o tamanho real do objeto quando ele é conhecido', () => {
    const eps = podcastEpisodes(
      [{ slug: 'a', title: 'A', dek: 'dek', published_at: '2026-10-01', audio_path: 'a-ff.mp3', audio_seconds: 600 }],
      'https://x.supabase.co',
      'https://kauaramos.com',
    );
    const xml = rssFeed(podcastShow(BASE), eps, { bytesBySlug: { a: 4964639 } });
    expect(xml).toContain('length="4964639"');
    expect(xml).not.toContain('length="4800000"');
  });

  it('sem o tamanho real, estima e nunca publica zero', () => {
    const eps = podcastEpisodes(
      [{ slug: 'a', title: 'A', dek: 'dek', published_at: '2026-10-01', audio_path: 'a-ff.mp3', audio_seconds: null }],
      'https://x.supabase.co',
      'https://kauaramos.com',
    );
    expect(rssFeed(podcastShow(BASE), eps)).toMatch(/length="[1-9]\d*"/);
  });
});

// Lapidação pós-lançamento (09/10/2026): o que o ouvinte vê no Spotify.
describe('o show no Spotify', () => {
  const show = podcastShow(BASE);
  const feed = rssFeed(show, podcastEpisodes([row()], SUPABASE, BASE));

  it('tem palavra-chave em português no título, que é o que a busca pesa', () => {
    expect(show.title).toBe('Wealth & Wellness: saúde e longevidade com ciência');
  });

  it('declara que as vozes e o roteiro são de IA, com curadoria do Kauã', () => {
    expect(show.description).toContain('vozes geradas por inteligência artificial');
    expect(show.description).toContain('curadoria de Kauã Ramos');
    expect(show.description).not.toContain('os textos são de Kauã');
  });

  it('avisa que não substitui consulta', () => {
    expect(show.description).toContain('não substitui consulta com médico ou nutricionista');
  });

  it('trava o feed contra importação por outro host e declara a autoria', () => {
    expect(feed).toContain('xmlns:podcast="https://podcastindex.org/namespace/1.0"');
    expect(feed).toContain('<podcast:locked owner="podcast@kauaramos.com">yes</podcast:locked>');
    expect(feed).toMatch(/<podcast:guid>[0-9a-f-]{36}<\/podcast:guid>/);
    expect(feed).toContain('<copyright>');
  });

  it('declara as categorias que o conteúdo cobre', () => {
    expect(feed).toContain('<itunes:category text="Fitness" />');
    expect(feed).toContain('<itunes:category text="Nutrition" />');
    expect(feed).toContain('<itunes:category text="Science" />');
  });
});

describe('a descrição do episódio', () => {
  const [episode] = podcastEpisodes([row()], SUPABASE, BASE);
  const feed = rssFeed(podcastShow(BASE), [episode]);
  const utm = 'utm_source=spotify&amp;utm_medium=podcast&amp;utm_campaign=condicionamento-pesa-mais-que-o-imc';

  it('abre com o link do artigo, medido, antes da dobra do app', () => {
    const description = feed.match(/<description>([^<]*)<\/description>\s*<content:encoded>/)?.[1] ?? '';
    expect(description.indexOf('circle/artigos/condicionamento')).toBeGreaterThan(-1);
    expect(description.indexOf('circle/artigos/condicionamento')).toBeLessThan(description.indexOf('Em 20 estudos'));
    // HTML dentro de XML: o leitor desfaz o XML e chega no href com & simples
    expect(feed).toContain(utm.replace(/&amp;/g, '&amp;amp;'));
  });

  it('leva HTML clicável também no content:encoded', () => {
    expect(feed).toContain('<content:encoded>');
    expect(feed).toContain('&lt;a href=');
  });

  it('convida pro Circle', () => {
    expect(feed).toContain(`${BASE}/circle?utm_source=spotify`);
  });

  it('traz o aviso de IA e de saúde em todo episódio', () => {
    expect(feed).toContain('Rafa e Dani são vozes geradas por inteligência artificial');
    expect(feed).toContain('não substitui consulta');
  });

  it('mantém o link do item limpo, sem UTM', () => {
    expect(feed).toContain(`<link>${BASE}/circle/artigos/condicionamento-pesa-mais-que-o-imc</link>`);
  });
});

describe('escapeXml e caractere de controle', () => {
  it('tira o que XML não aceita, senão um título do LLM derruba o feed inteiro', () => {
    expect(escapeXml('Sono\u0007 e\u0000 risco\u001F')).toBe('Sono e risco');
    expect(escapeXml('linha\nnova\ttab')).toBe('linha\nnova\ttab');
  });
});

describe('feedIsServable', () => {
  it('feed sem episódio não sai: pro Spotify, lista vazia é episódio apagado', () => {
    expect(feedIsServable([])).toBe(false);
    expect(feedIsServable(podcastEpisodes([row()], SUPABASE, BASE))).toBe(true);
  });
});

// 09/10/2026, pedido do Kauã: número do episódio na abertura e indicação de
// outros episódios ao longo do conteúdo, com o link nas notas.
describe('o número do episódio', () => {
  const rows = [
    row({ slug: 'c', title: 'C', published_at: '2026-10-09T13:00:00.000Z', audio_path: 'c-1.mp3' }),
    row({ slug: 'sem-mp3', published_at: '2026-10-08T13:00:00.000Z', audio_path: 'x-1.ogg' }),
    row({ slug: 'b', title: 'B', published_at: '2026-10-07T13:00:00.000Z', audio_path: 'b-1.mp3' }),
    row({ slug: 'a', title: 'A', published_at: '2026-09-04T13:00:00.000Z', audio_path: 'a-1.mp3' }),
  ];
  const eps = podcastEpisodes(rows, SUPABASE, BASE);

  it('é a ordem de publicação entre os que estão no feed, a partir de 1', () => {
    expect(eps.map((e) => [e.slug, e.number])).toEqual([['c', 3], ['b', 2], ['a', 1]]);
  });

  it('vai no feed como itunes:episode', () => {
    const feed = rssFeed(podcastShow(BASE), eps);
    expect(feed).toContain('<itunes:episode>3</itunes:episode>');
    expect(feed).toContain('<itunes:episode>1</itunes:episode>');
  });
});

describe('os episódios citados', () => {
  const rows = [
    row({ slug: 'magnesio', title: 'Magnésio e sono', published_at: '2026-10-09T13:00:00.000Z', audio_path: 'magnesio-1.mp3', podcast_refs: ['vitamina-d', 'nao-existe'] }),
    row({ slug: 'vitamina-d', title: 'Vitamina D: o alvo caiu', published_at: '2026-10-03T13:00:00.000Z', audio_path: 'vitamina-d-1.mp3' }),
  ];
  const [magnesio] = podcastEpisodes(rows, SUPABASE, BASE);
  const html = episodeDescription(magnesio, podcastShow(BASE));

  it('resolve número, título e link, e larga o que não está no feed', () => {
    expect(magnesio.refs).toEqual([
      { number: 1, title: 'Vitamina D: o alvo caiu', articleUrl: `${BASE}/circle/artigos/vitamina-d` },
    ]);
  });

  it('entra nas notas com o número, antes do convite pro Circle', () => {
    expect(html).toContain('Episódio 1: Vitamina D: o alvo caiu');
    expect(html).toContain(`${BASE}/circle/artigos/vitamina-d?utm_source=spotify`);
    expect(html.indexOf('Episódio 1')).toBeLessThan(html.indexOf('Wealth &amp; Wellness Circle'));
  });

  it('sem citação, a seção não aparece', () => {
    const [semRef] = podcastEpisodes([row()], SUPABASE, BASE);
    expect(episodeDescription(semRef, podcastShow(BASE))).not.toContain('Citados');
  });
});

describe('podcastRefs', () => {
  it('aceita até 3 slugs válidos, sem repetir e sem citar a si mesmo', () => {
    expect(podcastRefs(['a', 'b', 'a', 'eu'], 'eu')).toEqual(['a', 'b']);
  });

  it('ausente não mexe no que já está gravado', () => {
    expect(podcastRefs(undefined, 'eu')).toBeUndefined();
  });

  it('recusa formato errado', () => {
    expect(podcastRefs('a', 'eu')).toBeNull();
    expect(podcastRefs(['A B'], 'eu')).toBeNull();
    expect(podcastRefs(['a', 'b', 'c', 'd'], 'eu')).toBeNull();
  });
});
