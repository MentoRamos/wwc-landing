import { describe, expect, it } from 'vitest';
import { mergeCheckoutUtm } from '@/lib/analytics/utm';

/**
 * Once IMERSAO_CHECKOUT_URL stops being null, every CTA needs to hand the
 * checkout the same attribution the visitor arrived with — Hotmart's own
 * `src`/`sck` plus the five standard `utm_*` params — or every sale looks
 * organic no matter which ad paid for it.
 */
describe('mergeCheckoutUtm', () => {
  it('forwards utm and Hotmart tracking params from the page url onto the checkout url', () => {
    const merged = mergeCheckoutUtm(
      'https://pay.hotmart.com/ABC123',
      'https://kauaramos.com/imersao?utm_source=instagram&utm_medium=story&utm_campaign=lancamento&utm_content=v1&utm_term=hrv&sck=abc&src=xyz'
    );
    const url = new URL(merged);
    expect(url.searchParams.get('utm_source')).toBe('instagram');
    expect(url.searchParams.get('utm_medium')).toBe('story');
    expect(url.searchParams.get('utm_campaign')).toBe('lancamento');
    expect(url.searchParams.get('utm_content')).toBe('v1');
    expect(url.searchParams.get('utm_term')).toBe('hrv');
    expect(url.searchParams.get('sck')).toBe('abc');
    expect(url.searchParams.get('src')).toBe('xyz');
  });

  it('leaves the checkout url unchanged when the page url carries no tracking params', () => {
    expect(mergeCheckoutUtm('https://pay.hotmart.com/ABC123', 'https://kauaramos.com/imersao')).toBe(
      'https://pay.hotmart.com/ABC123'
    );
  });

  it('does not forward query params outside the known allow-list', () => {
    const merged = mergeCheckoutUtm(
      'https://pay.hotmart.com/ABC123',
      'https://kauaramos.com/imersao?ref=amigo&utm_campaign=lancamento'
    );
    const url = new URL(merged);
    expect(url.searchParams.get('ref')).toBeNull();
    expect(url.searchParams.get('utm_campaign')).toBe('lancamento');
  });

  it('preserves query params already on the checkout url', () => {
    const merged = mergeCheckoutUtm(
      'https://pay.hotmart.com/ABC123?offer=full',
      'https://kauaramos.com/imersao?utm_source=email'
    );
    const url = new URL(merged);
    expect(url.searchParams.get('offer')).toBe('full');
    expect(url.searchParams.get('utm_source')).toBe('email');
  });

  it('returns the checkout url unchanged if the page url is not parseable', () => {
    expect(mergeCheckoutUtm('https://pay.hotmart.com/ABC123', 'not a url')).toBe(
      'https://pay.hotmart.com/ABC123'
    );
  });
});
