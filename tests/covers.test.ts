import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOPICS, normalizeTopic, pickCover, type Cover } from '@/lib/core/covers.core';
import { COVERS } from '@/lib/articles/covers';

describe('normalizeTopic', () => {
  it('mantém um tema que já é da lista', () => {
    expect(normalizeTopic('sono')).toBe('sono');
  });

  it('leva sinônimo e grafia livre do cron ao tema fechado', () => {
    expect(normalizeTopic('VO2')).toBe('cardio');
    expect(normalizeTopic('passos')).toBe('movimento');
    expect(normalizeTopic('glicose')).toBe('metabolismo');
    expect(normalizeTopic('Álcool')).toBe('alcool');
    expect(normalizeTopic('composição corporal')).toBe('composicao-corporal');
    expect(normalizeTopic('treino-de-forca')).toBe('forca');
    expect(normalizeTopic('condicionamento')).toBe('cardio');
    expect(normalizeTopic('atividade-fisica')).toBe('movimento');
    expect(normalizeTopic('exercicio')).toBe('cardio');
  });

  it('tema desconhecido ou vazio vira o genérico', () => {
    expect(normalizeTopic('astrologia')).toBe('longevidade');
    expect(normalizeTopic(null)).toBe('longevidade');
    expect(normalizeTopic('')).toBe('longevidade');
  });
});

const catalog: Cover[] = [
  { id: 'sono-a', topics: ['sono'], alt: 'a' },
  { id: 'sono-b', topics: ['sono', 'recuperacao'], alt: 'b' },
  { id: 'long-a', topics: ['longevidade'], alt: 'c' },
];

describe('pickCover', () => {
  it('escolhe a capa do tema', () => {
    expect(['sono-a', 'sono-b']).toContain(pickCover('sono', {}, 'x', catalog));
  });

  it('prefere a menos usada, para dois artigos seguidos não repetirem a imagem', () => {
    expect(pickCover('sono', { 'sono-a': 3, 'sono-b': 1 }, 'x', catalog)).toBe('sono-b');
    expect(pickCover('sono', { 'sono-a': 0, 'sono-b': 1 }, 'x', catalog)).toBe('sono-a');
  });

  it('desempata de forma estável pelo slug: o mesmo artigo sempre ganha a mesma', () => {
    const first = pickCover('sono', {}, 'regularidade-do-sono', catalog);
    expect(pickCover('sono', {}, 'regularidade-do-sono', catalog)).toBe(first);
  });

  it('tema sem capa cai no genérico', () => {
    expect(pickCover('alcool', {}, 'x', catalog)).toBe('long-a');
  });

  it('com o tema escrito livre, normaliza antes de escolher', () => {
    expect(['sono-a', 'sono-b']).toContain(pickCover('Sono', {}, 'x', catalog));
  });
});

describe('o catálogo de capas', () => {
  it('não repete id', () => {
    const ids = COVERS.map((cover) => cover.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todo arquivo existe nos três tamanhos', () => {
    const missing = COVERS.flatMap((cover) =>
      ['1600.webp', '800.webp', '1200.jpg']
        .map((size) => `public/photos/artigos/${cover.id}-${size}`)
        .filter((path) => !existsSync(join(process.cwd(), path))),
    );
    expect(missing).toEqual([]);
  });

  it('todo tema tem pelo menos duas capas, para alternar', () => {
    const thin = TOPICS.filter(
      (topic) => COVERS.filter((cover) => cover.topics.includes(topic)).length < 2,
    );
    expect(thin).toEqual([]);
  });

  it('só usa temas da lista e toda capa tem texto alternativo', () => {
    for (const cover of COVERS) {
      expect(cover.alt.length).toBeGreaterThan(10);
      for (const topic of cover.topics) expect(TOPICS).toContain(topic);
    }
  });
});
