import { describe, it, expect } from 'vitest';
import { resolveSiteUrl, isEventHost } from '../lib/core/site.core';

describe('resolveSiteUrl', () => {
  it('uses the explicit site url when it is set', () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://kauaramos.com' })).toBe(
      'https://kauaramos.com'
    );
  });

  it('strips a trailing slash so metadata never builds a double slash', () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://kauaramos.com/' })).toBe(
      'https://kauaramos.com'
    );
  });

  it('falls back to the vercel deployment url when no site url is set', () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'wwc-landing-rho.vercel.app' })).toBe(
      'https://wwc-landing-rho.vercel.app'
    );
  });

  it('keeps the protocol when the vercel url already carries one', () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'https://a.vercel.app' })).toBe(
      'https://a.vercel.app'
    );
  });

  it('falls back to localhost when nothing is set, so the build never crashes', () => {
    expect(resolveSiteUrl({})).toBe('http://localhost:3000');
  });

  it('ignores an empty string, which is what an unset vercel env looks like', () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: '   ' })).toBe('http://localhost:3000');
  });

  it('never resolves to a third party domain by default', () => {
    expect(resolveSiteUrl({})).not.toContain('ae.club');
  });
});

describe('isEventHost', () => {
  it('matches the configured event host', () => {
    expect(isEventHost('wwconnect.com.br', 'wwconnect.com.br')).toBe(true);
  });

  it('ignores the port, which localhost always carries', () => {
    expect(isEventHost('wwconnect.com.br:3000', 'wwconnect.com.br')).toBe(true);
  });

  it('is case insensitive, because Host headers are not normalized', () => {
    expect(isEventHost('WWConnect.com.BR', 'wwconnect.com.br')).toBe(true);
  });

  it('does not match a different host', () => {
    expect(isEventHost('kauaramos.com', 'wwconnect.com.br')).toBe(false);
  });

  it('does not match a subdomain that merely ends with the event host', () => {
    expect(isEventHost('evil-wwconnect.com.br', 'wwconnect.com.br')).toBe(false);
  });

  it('is false when no event host is configured, so nothing is rewritten by accident', () => {
    expect(isEventHost('wwconnect.com.br', undefined)).toBe(false);
    expect(isEventHost('wwconnect.com.br', '')).toBe(false);
  });

  it('is false when the request carries no host', () => {
    expect(isEventHost(null, 'wwconnect.com.br')).toBe(false);
  });
});
