import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';

/**
 * The proxy is what renews the session cookie. A matcher that quietly stops
 * covering a route does not raise an error — people just start getting logged
 * out on that route and nobody can tell why.
 *
 * Turbopack reads the matcher out of `proxy.ts` statically and ignores
 * anything it cannot parse, so importing the value here would prove nothing
 * about what actually ships. This reads the source instead.
 */
function shippedMatcher(): string[] {
  const source = readFileSync(fileURLToPath(new URL('../proxy.ts', import.meta.url)), 'utf8');
  // Greedy to the last bracket: the pattern itself contains `[\w]`, so a
  // lazy match stops inside the string it is meant to capture.
  const found = /export const config = \{\s*matcher:\s*(\[[\s\S]*\])\s*,?\s*\};/.exec(source);
  if (!found) throw new Error('proxy.ts no longer exports a static `config.matcher` array.');
  return JSON.parse(found[1].replace(/'/g, '"'));
}

const matcher = shippedMatcher();
const matches = (url: string) => unstable_doesMiddlewareMatch({ config: { matcher }, url });

describe('the proxy matcher that ships in proxy.ts', () => {
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
