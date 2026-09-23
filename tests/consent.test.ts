import { describe, expect, it } from 'vitest';
import { CONSENT_STORAGE_KEY, decideConsent } from '@/lib/analytics/consent';

/**
 * `/imersao` reuses the exact consent contract kauaramos.com already has
 * (see ~/Projects/wealth-wellness-protocol/landing-kauaramos/assets/pixel.js):
 * one localStorage key, three outcomes. Reusing the same key means a visitor
 * who already answered on the main site is not asked twice once /imersao is
 * reached through the apex rewrite (same origin, same localStorage).
 */
describe('decideConsent', () => {
  it('loads the pixel when the visitor already said yes', () => {
    expect(decideConsent('sim')).toBe('load');
  });

  it('skips the pixel entirely when the visitor already said no', () => {
    expect(decideConsent('nao')).toBe('skip');
  });

  it('asks when nothing was ever stored', () => {
    expect(decideConsent(null)).toBe('ask');
  });

  it('asks again on any unrecognized stored value, instead of assuming consent', () => {
    expect(decideConsent('')).toBe('ask');
    expect(decideConsent('yes')).toBe('ask');
    expect(decideConsent('true')).toBe('ask');
  });

  it('uses the same storage key name as the main site', () => {
    expect(CONSENT_STORAGE_KEY).toBe('kr_consent');
  });
});

describe('decideConsent without a configured pixel', () => {
  it('never asks and never loads when there is no pixel to load', () => {
    expect(decideConsent(null, false)).toBe('skip');
    expect(decideConsent('sim', false)).toBe('skip');
    expect(decideConsent('nao', false)).toBe('skip');
  });
});
