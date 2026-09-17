import { describe, expect, it } from 'vitest';
import {
  PRODUCTS,
  expiryFrom,
  normEmail,
  parseGrantList,
} from '@/lib/core/admin.core';

/**
 * Must agree with `public.norm_email` in the schema, character for character.
 * If TypeScript and Postgres disagree about what an address is, a grant typed
 * here lands on a row nothing will ever match, and the person signs in to an
 * empty page with no error anywhere.
 */
describe('normEmail', () => {
  it('lowercases and trims, exactly like lower(btrim(value))', () => {
    expect(normEmail('  Kaua@Example.COM  ')).toBe('kaua@example.com');
  });

  it('leaves the inside of the address alone', () => {
    expect(normEmail('First.Last+tag@Example.com')).toBe('first.last+tag@example.com');
  });

  it('does not collapse inner whitespace, because Postgres does not either', () => {
    expect(normEmail(' a b@x.com ')).toBe('a b@x.com');
  });
});

describe('parseGrantList', () => {
  it('takes one address per line', () => {
    const { entries, errors } = parseGrantList('a@x.com\nb@y.com');
    expect(errors).toEqual([]);
    expect(entries).toEqual([
      { email: 'a@x.com', product: undefined },
      { email: 'b@y.com', product: undefined },
    ]);
  });

  it('takes an optional product in a second column', () => {
    const { entries } = parseGrantList('a@x.com, protocol\nb@y.com;circle');
    expect(entries).toEqual([
      { email: 'a@x.com', product: 'protocol' },
      { email: 'b@y.com', product: 'circle' },
    ]);
  });

  it('normalises every address it returns', () => {
    const { entries } = parseGrantList('  KAUA@Example.COM  ');
    expect(entries[0].email).toBe('kaua@example.com');
  });

  it('ignores blank lines and a header row someone pasted from a sheet', () => {
    const { entries, errors } = parseGrantList('email,product\n\na@x.com,circle\n   \n');
    expect(errors).toEqual([]);
    expect(entries).toEqual([{ email: 'a@x.com', product: 'circle' }]);
  });

  it('reports a bad line instead of silently dropping it', () => {
    const { entries, errors } = parseGrantList('a@x.com\nnot-an-email\nb@y.com');
    expect(entries).toHaveLength(2);
    expect(errors).toEqual([{ line: 2, raw: 'not-an-email', reason: 'endereço inválido' }]);
  });

  it('reports a product that is not one of ours, rather than inventing one', () => {
    const { errors } = parseGrantList('a@x.com,protocolo');
    expect(errors).toEqual([{ line: 1, raw: 'a@x.com,protocolo', reason: 'produto desconhecido' }]);
  });

  it('accepts every product the database enum accepts', () => {
    const raw = PRODUCTS.map((product, i) => `p${i}@x.com,${product}`).join('\n');
    const { entries, errors } = parseGrantList(raw);
    expect(errors).toEqual([]);
    expect(entries.map((e) => e.product)).toEqual([...PRODUCTS]);
  });

  it('drops a duplicate address, keeping the first, so one paste is one grant', () => {
    const { entries } = parseGrantList('a@x.com,circle\nA@X.com,protocol');
    expect(entries).toEqual([{ email: 'a@x.com', product: 'circle' }]);
  });

  it('has nothing to do on an empty paste', () => {
    expect(parseGrantList('')).toEqual({ entries: [], errors: [] });
    expect(parseGrantList('   \n  ')).toEqual({ entries: [], errors: [] });
  });
});

/**
 * `expires_at IS NULL` is lifetime and a future timestamp is a live
 * subscription — the whole access model rests on this one column, so the thing
 * that computes it gets pinned here.
 */
describe('expiryFrom', () => {
  const now = new Date('2026-09-11T10:00:00.000Z');

  it('gives lifetime a null, not a far-off date', () => {
    expect(expiryFrom('lifetime', now)).toBeNull();
  });

  it('counts days forward from now', () => {
    expect(expiryFrom('30d', now)?.toISOString()).toBe('2026-10-11T10:00:00.000Z');
    expect(expiryFrom('90d', now)?.toISOString()).toBe('2026-12-10T10:00:00.000Z');
    expect(expiryFrom('365d', now)?.toISOString()).toBe('2027-09-11T10:00:00.000Z');
  });

  it('takes an explicit date, ending that day rather than starting it', () => {
    expect(expiryFrom('2026-12-31', now)?.toISOString()).toBe('2026-12-31T23:59:59.999Z');
  });

  it('refuses a date already past, which would grant nothing at all', () => {
    expect(() => expiryFrom('2026-01-01', now)).toThrow(/passado/i);
  });

  it('refuses something that is not a choice we offer', () => {
    expect(() => expiryFrom('para sempre', now)).toThrow(/inválid/i);
    expect(() => expiryFrom('', now)).toThrow(/inválid/i);
  });
});
