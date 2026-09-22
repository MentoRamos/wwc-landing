import { describe, expect, it } from 'vitest';
import {
  buildShelf,
  formatDuration,
  libraryStanding,
  progressPercent,
  resumePosition,
  type CatalogItem,
} from '@/lib/core/library.core';

const item = (over: Partial<CatalogItem> = {}): CatalogItem => ({
  id: 'id-1',
  slug: 'guia',
  kind: 'pdf',
  collection: 'guias',
  title: 'Um guia',
  description: null,
  duration_seconds: null,
  season: null,
  required_products: ['protocol', 'circle'],
  sort_order: 0,
  ...over,
});

/**
 * The shelf is built from two reads: the catalogue, which every signed-in
 * person sees in full, and the entitled rows, which RLS has already filtered.
 *
 * The one property that matters is that it fails closed. An item is locked
 * unless its id is explicitly in the entitled set — so a bug in the second
 * query hides content rather than revealing it.
 */
describe('buildShelf', () => {
  it('unlocks only what the entitled read actually returned', () => {
    const catalog = [item({ id: 'a', slug: 'a' }), item({ id: 'b', slug: 'b' })];
    const [shelf] = buildShelf(catalog, new Set(['a']));

    expect(shelf.items.map((i) => [i.slug, i.locked])).toEqual([
      ['a', false],
      ['b', true],
    ]);
  });

  it('locks everything when the entitled read came back empty', () => {
    const catalog = [item({ id: 'a' }), item({ id: 'b' })];
    const [shelf] = buildShelf(catalog, new Set());
    expect(shelf.items.every((i) => i.locked)).toBe(true);
  });

  it('never unlocks an id the catalogue does not contain', () => {
    // A stale or forged set cannot add a shelf entry, only mark one open.
    const [shelf] = buildShelf([item({ id: 'a' })], new Set(['a', 'fantasma']));
    expect(shelf.items).toHaveLength(1);
  });

  it('groups by collection and keeps the collections in first-seen order', () => {
    const catalog = [
      item({ id: 'a', collection: 'guias' }),
      item({ id: 'b', collection: 'encontros' }),
      item({ id: 'c', collection: 'guias' }),
    ];
    const shelves = buildShelf(catalog, new Set());
    expect(shelves.map((s) => s.collection)).toEqual(['guias', 'encontros']);
    expect(shelves[0].items).toHaveLength(2);
  });

  it('orders inside a collection by sort_order, then by title', () => {
    const catalog = [
      item({ id: 'a', title: 'Zebra', sort_order: 1 }),
      item({ id: 'b', title: 'Abacaxi', sort_order: 2 }),
      item({ id: 'c', title: 'Melancia', sort_order: 1 }),
    ];
    const [shelf] = buildShelf(catalog, new Set());
    expect(shelf.items.map((i) => i.title)).toEqual(['Melancia', 'Zebra', 'Abacaxi']);
  });

  it('has nothing to show when the catalogue is empty', () => {
    expect(buildShelf([], new Set())).toEqual([]);
  });
});

describe('formatDuration', () => {
  it('writes minutes and seconds under an hour', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(599)).toBe('9:59');
  });

  it('writes hours once there are any, padding the minutes', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('says nothing for a missing duration instead of guessing zero', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(undefined)).toBe('');
  });
});

/**
 * Where a replay should start. The player sends a position every few seconds,
 * so this is what stands between "continue where you left off" and "restart a
 * ninety minute call from the top".
 */
describe('resumePosition', () => {
  it('resumes where the person stopped', () => {
    expect(resumePosition({ position_seconds: 742, completed_at: null }, 3600)).toBe(742);
  });

  it('starts over once it was finished, rather than parking on the credits', () => {
    expect(resumePosition({ position_seconds: 3590, completed_at: 'ontem' }, 3600)).toBe(0);
  });

  it('starts over when the saved position is at the very end', () => {
    // Within the last 15 seconds there is nothing left to watch.
    expect(resumePosition({ position_seconds: 3595, completed_at: null }, 3600)).toBe(0);
  });

  it('starts at zero for someone who never opened it', () => {
    expect(resumePosition(null, 3600)).toBe(0);
    expect(resumePosition(undefined, 3600)).toBe(0);
  });

  it('ignores a position past the end, which means the duration changed', () => {
    expect(resumePosition({ position_seconds: 9999, completed_at: null }, 3600)).toBe(0);
  });

  it('trusts the saved position when the duration is unknown', () => {
    expect(resumePosition({ position_seconds: 742, completed_at: null }, null)).toBe(742);
  });
});

describe('progressPercent', () => {
  /**
   * A barra tem que concordar com `resumePosition`, senão a tela mente: uma
   * barra em 98% num item que, ao clicar, volta para o começo é pior do que
   * barra nenhuma.
   */
  it('mostra 100 para o que foi concluído', () => {
    expect(progressPercent({ position_seconds: 10, completed_at: '2026-09-14T00:00:00Z' }, 600)).toBe(100);
  });

  it('mostra a fração assistida', () => {
    expect(progressPercent({ position_seconds: 150, completed_at: null }, 600)).toBe(25);
  });

  it('devolve 0 quando não há progresso nenhum', () => {
    expect(progressPercent(null, 600)).toBe(0);
  });

  it('devolve 0 sem duração conhecida, porque fração de nada não existe', () => {
    expect(progressPercent({ position_seconds: 150, completed_at: null }, null)).toBe(0);
  });

  it('concorda com resumePosition na cauda: quem volta ao começo mostra 0', () => {
    const progress = { position_seconds: 595, completed_at: null };
    expect(resumePosition(progress, 600)).toBe(0);
    expect(progressPercent(progress, 600)).toBe(0);
  });

  it('nunca passa de 100 quando a gravação encurtou', () => {
    expect(progressPercent({ position_seconds: 9000, completed_at: null }, 600)).toBe(0);
  });
});

/**
 * Quantos itens a pessoa tem, quantos já terminou, e qual é o próximo.
 *
 * O agregado existe porque a plataforma sabia o progresso item a item e nunca
 * dizia o conjunto: a home mostrava "continue de onde parou" para um item só,
 * e quem nunca tinha aberto nada via uma tela sem nenhum começo. `next` é a
 * resposta para essa segunda tela, e é sempre um item destravado, porque
 * sugerir o que a pessoa não pode abrir é pior do que não sugerir nada.
 */
describe('libraryStanding', () => {
  const shelves = (...slugs: [string, boolean][]) =>
    buildShelf(
      slugs.map(([slug], i) => item({ id: slug, slug, sort_order: i })),
      new Set(slugs.filter(([, unlocked]) => unlocked).map(([slug]) => slug)),
    );

  it('conta só o que está destravado, não o catálogo inteiro', () => {
    const standing = libraryStanding(shelves(['a', true], ['b', false]), new Set());
    expect(standing.unlocked).toBe(1);
    expect(standing.total).toBe(2);
  });

  it('conta os concluídos entre os destravados', () => {
    const standing = libraryStanding(shelves(['a', true], ['b', true]), new Set(['a']));
    expect(standing.completed).toBe(1);
  });

  it('sugere o primeiro destravado que ainda não foi concluído', () => {
    const standing = libraryStanding(shelves(['a', true], ['b', true]), new Set(['a']));
    expect(standing.next?.slug).toBe('b');
  });

  it('nunca sugere um item travado, mesmo sendo o primeiro da prateleira', () => {
    const standing = libraryStanding(shelves(['a', false], ['b', true]), new Set());
    expect(standing.next?.slug).toBe('b');
  });

  it('não sugere nada quando tudo que é dela já foi concluído', () => {
    const standing = libraryStanding(shelves(['a', true]), new Set(['a']));
    expect(standing.next).toBeNull();
  });

  it('não sugere nada para quem não tem nenhum item liberado', () => {
    const standing = libraryStanding(shelves(['a', false]), new Set());
    expect(standing.next).toBeNull();
    expect(standing.unlocked).toBe(0);
  });

  it('ignora um slug concluído que não está mais no catálogo dela', () => {
    const standing = libraryStanding(shelves(['a', true]), new Set(['a', 'sumiu']));
    expect(standing.completed).toBe(1);
  });
});
