import { describe, expect, it } from 'vitest';
import {
  buildShelf,
  formatDuration,
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
