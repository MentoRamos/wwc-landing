import { describe, expect, it } from 'vitest';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { PROXY_MATCHER } from '@/lib/core/proxy-matcher';

const matches = (url: string) =>
  unstable_doesMiddlewareMatch({ config: { matcher: PROXY_MATCHER }, url });

/**
 * The proxy is what renews the session cookie. A matcher that quietly stops
 * covering a route does not raise an error — people just start getting logged
 * out on that route and nobody can tell why. So the matcher is asserted, not
 * assumed.
 */
describe('the proxy matcher', () => {
  it('covers every page a signed-in person walks through', () => {
    for (const url of [
      '/',
      '/entrar',
      '/inicio',
      '/biblioteca',
      '/biblioteca/guia-sono',
      '/circle',
      '/connect',
      '/conta',
      '/admin/acessos',
      '/auth/callback',
      '/api/lead',
      '/api/auth/sair',
    ]) {
      expect(matches(url), url).toBe(true);
    }
  });

  it('leaves the build output and the public files alone', () => {
    for (const url of [
      '/_next/static/chunks/main.js',
      '/_next/image?url=%2Fphotos%2Fa.png&w=640&q=75',
      '/photos/logo-wwc-transparent.png',
      '/icon.svg',
      '/favicon.ico',
      '/audio/tema.mp3',
    ]) {
      expect(matches(url), url).toBe(false);
    }
  });
});
