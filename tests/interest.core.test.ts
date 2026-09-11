import { describe, expect, it } from 'vitest';
import { readInterest, PRODUCTS } from '@/lib/core/interest.core';

/**
 * The form on the other side of this is the only thing standing between a
 * person who wants to buy and a page that cannot sell them anything yet. It
 * has to accept what a real person types — a phone number with dots and
 * dashes, an address with a capital letter, a name with a trailing space —
 * and refuse what is not a person at all.
 */
describe('readInterest', () => {
  const valid = { email: 'Kaua@Example.com ', product: 'circle' };

  it('normalises the email the same way the database does', () => {
    expect(readInterest(valid)?.email).toBe('kaua@example.com');
  });

  it('takes an email and a product and nothing else is required', () => {
    expect(readInterest(valid)).toMatchObject({ email: 'kaua@example.com', product: 'circle' });
  });

  it.each(PRODUCTS)('accepts %s as a product', (product) => {
    expect(readInterest({ ...valid, product })).not.toBeNull();
  });

  it('refuses a product that is not one of ours', () => {
    expect(readInterest({ ...valid, product: 'protocol_pro' })).toBeNull();
    expect(readInterest({ ...valid, product: '' })).toBeNull();
    expect(readInterest({ email: 'a@b.com' })).toBeNull();
  });

  it.each([
    'sem-arroba',
    'dois@@arrobas.com',
    'sem@dominio',
    '',
    '   ',
  ])('refuses %j as an email', (email) => {
    expect(readInterest({ ...valid, email })).toBeNull();
  });

  it('refuses anything that is not an object', () => {
    expect(readInterest(null)).toBeNull();
    expect(readInterest('kaua@example.com')).toBeNull();
    expect(readInterest([])).toBeNull();
  });

  it('keeps the name when there is one, trimmed', () => {
    expect(readInterest({ ...valid, name: '  Kauã Ramos ' })?.name).toBe('Kauã Ramos');
  });

  it('drops a name that is only whitespace rather than storing a blank', () => {
    expect(readInterest({ ...valid, name: '   ' })?.name).toBeUndefined();
  });

  it.each([
    ['(62) 99173-1015', '5562991731015'],
    ['62 99173 1015', '5562991731015'],
    ['+55 62 99173-1015', '5562991731015'],
    ['5562991731015', '5562991731015'],
    ['+1 561 986 5175', '15619865175'],
  ])('normalises the whatsapp %j to %j', (given, expected) => {
    expect(readInterest({ ...valid, whatsapp: given })?.whatsapp).toBe(expected);
  });

  it('drops a whatsapp too short to be a number instead of refusing the lead', () => {
    // Losing the phone is a nuisance. Losing the whole lead over a typo in an
    // optional field is the failure this exists to prevent.
    const read = readInterest({ ...valid, whatsapp: '123' });
    expect(read).not.toBeNull();
    expect(read?.whatsapp).toBeUndefined();
  });

  it('caps the free text so a form post cannot write a novel into the table', () => {
    const read = readInterest({ ...valid, name: 'a'.repeat(500) });
    expect(read?.name?.length).toBe(120);
  });

  it('keeps where the person came from, when the page says', () => {
    expect(readInterest({ ...valid, source: 'circle-sem-checkout' })?.source).toBe(
      'circle-sem-checkout',
    );
  });

  it('falls back to a source rather than storing nothing', () => {
    expect(readInterest(valid)?.source).toBe('site');
  });
});
