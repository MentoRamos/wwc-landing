import { describe, expect, it } from 'vitest';
import {
  KINDS,
  isPublished,
  parseDuration,
  parseYoutubeId,
  readContentForm,
  slugify,
} from '@/lib/core/content.core';

describe('slugify', () => {
  it('tira acento, caixa e pontuação', () => {
    expect(slugify('Guia do Sono — Edição Nº 2')).toBe('guia-do-sono-edicao-no-2');
  });

  it('não deixa hífen sobrando nas pontas nem repetido', () => {
    expect(slugify('  ///Metabolismo   &   Energia//  ')).toBe('metabolismo-energia');
  });

  it('devolve vazio quando não sobra nada utilizável', () => {
    expect(slugify('—  ///  ')).toBe('');
  });
});

/**
 * O `youtube_id` é tratado como segredo no schema, e é o que a pessoa cola
 * vindo da barra do navegador. Aceitar a URL inteira e guardar só o id evita
 * uma linha que renderiza um player quebrado — e a URL de "watch" carrega
 * parâmetros (`list`, `t`, `si`) que não podem entrar na coluna.
 */
describe('parseYoutubeId', () => {
  it('aceita o id puro', () => {
    expect(parseYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extrai de uma URL de watch, descartando os parâmetros', () => {
    expect(parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL&t=42')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('extrai de um link curto', () => {
    expect(parseYoutubeId('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ');
  });

  it('extrai de um link de embed', () => {
    expect(parseYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('recusa o que não é um id de 11 caracteres', () => {
    for (const bad of ['', '   ', 'curto', 'https://vimeo.com/12345', 'dQw4w9WgXcQextra']) {
      expect(parseYoutubeId(bad)).toBeUndefined();
    }
  });
});

describe('parseDuration', () => {
  it('lê mm:ss e hh:mm:ss', () => {
    expect(parseDuration('1:05')).toBe(65);
    expect(parseDuration('1:02:05')).toBe(3725);
  });

  it('lê segundos puros', () => {
    expect(parseDuration('90')).toBe(90);
  });

  it('devolve nulo para vazio, porque duração é opcional', () => {
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('   ')).toBeNull();
  });

  it('recusa o ilegível em vez de chutar zero', () => {
    for (const bad of ['abc', '1:2:3:4', '-5', '1:99']) {
      expect(() => parseDuration(bad)).toThrow();
    }
  });
});

describe('isPublished', () => {
  it('publicado é ter data, rascunho é não ter', () => {
    expect(isPublished({ published_at: '2026-09-14T00:00:00Z' })).toBe(true);
    expect(isPublished({ published_at: null })).toBe(false);
  });
});

/**
 * A guarda que importa de verdade neste arquivo.
 *
 * O schema tem um CHECK que recusa pdf com `youtube_id` e vídeo com
 * `storage_path`. Sem esta leitura, o formulário manda o par errado, o Postgres
 * recusa e o Kauã lê "violates check constraint" sem saber o que fez. Pior:
 * um vídeo salvo sem id nenhum vira uma linha na prateleira que não toca.
 */
describe('readContentForm', () => {
  const base = {
    title: 'Guia do Sono',
    collection: 'Guias',
    kind: 'pdf',
    required_products: ['circle'],
    storage_path: 'guias/sono.pdf',
    publish: 'on',
  };

  it('monta uma linha de pdf sem tocar em youtube_id', () => {
    const result = readContentForm(base, new Date('2026-09-14T12:00:00Z'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.row).toMatchObject({
      slug: 'guia-do-sono',
      kind: 'pdf',
      storage_path: 'guias/sono.pdf',
      youtube_id: null,
      required_products: ['circle'],
    });
    expect(result.row.published_at).toBe('2026-09-14T12:00:00.000Z');
  });

  it('monta uma linha de vídeo sem tocar em storage_path', () => {
    const result = readContentForm(
      { ...base, kind: 'video', storage_path: '', youtube_id: 'https://youtu.be/dQw4w9WgXcQ' },
      new Date(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.row.youtube_id).toBe('dQw4w9WgXcQ');
    expect(result.row.storage_path).toBeNull();
  });

  it('deixa published_at nulo quando não se pede publicação', () => {
    const result = readContentForm({ ...base, publish: '' }, new Date());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row.published_at).toBeNull();
  });

  it('recusa um vídeo sem id em vez de criar prateleira que não toca', () => {
    const result = readContentForm({ ...base, kind: 'video', youtube_id: '' }, new Date());
    expect(result.ok).toBe(false);
  });

  it('recusa um pdf sem caminho no bucket', () => {
    const result = readContentForm({ ...base, storage_path: '' }, new Date());
    expect(result.ok).toBe(false);
  });

  it('recusa título vazio, que viraria um slug vazio', () => {
    const result = readContentForm({ ...base, title: '—' }, new Date());
    expect(result.ok).toBe(false);
  });

  it('recusa produto que não existe, para o enum não estourar no banco', () => {
    const result = readContentForm({ ...base, required_products: ['inventado'] }, new Date());
    expect(result.ok).toBe(false);
  });

  /**
   * `required_products` vazio com o item publicado é a falha silenciosa desta
   * tela: o `&&` do RLS nunca casa, então ninguém — nem quem pagou — abre o
   * item, e a prateleira mostra um cadeado que não abre para ninguém.
   */
  it('recusa publicar sem nenhum produto exigido', () => {
    const result = readContentForm({ ...base, required_products: [] }, new Date());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/produto/i);
  });

  it('usa o slug digitado quando existe, em vez de derivar do título', () => {
    const result = readContentForm({ ...base, slug: 'sono-v2' }, new Date());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row.slug).toBe('sono-v2');
  });
});

describe('KINDS', () => {
  it('é exatamente o enum do banco', () => {
    expect([...KINDS]).toEqual(['pdf', 'video']);
  });
});
