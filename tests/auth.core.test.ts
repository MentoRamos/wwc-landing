import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AFTER_LOGIN,
  resolveCallbackOrigin,
  safeNextPath,
} from '@/lib/core/auth.core';

/**
 * `?next=` comes straight off a URL a stranger can write. Everything here is
 * about one bug: the sign-in page bouncing a freshly authenticated person to
 * somewhere that is not us.
 */
describe('safeNextPath', () => {
  it('keeps an ordinary path, query and hash included', () => {
    expect(safeNextPath('/biblioteca')).toBe('/biblioteca');
    expect(safeNextPath('/biblioteca/protocolo?aba=pdf#topo')).toBe(
      '/biblioteca/protocolo?aba=pdf#topo',
    );
  });

  it('falls back when there is nothing to go back to', () => {
    expect(safeNextPath(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath(undefined)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('   ')).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('refuses a protocol-relative URL, which browsers read as another host', () => {
    expect(safeNextPath('//evil.com')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('//evil.com/pagar')).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('refuses the backslash spellings browsers normalise into //', () => {
    expect(safeNextPath('/\\evil.com')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('\\\\evil.com')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('/\tevil.com')).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('refuses an absolute URL even when it points at us', () => {
    expect(safeNextPath('https://kauaramos.com/biblioteca')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('http://localhost:3000/inicio')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('javascript:alert(1)')).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('refuses a path that does not start at the root', () => {
    expect(safeNextPath('biblioteca')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('../admin')).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('refuses control characters, which smuggle headers', () => {
    expect(safeNextPath('/ok\nLocation: https://evil.com')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('/ok\r\nSet-Cookie: a=b')).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('does not send someone back to the door they just came through', () => {
    expect(safeNextPath('/entrar')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('/entrar?next=/conta')).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath('/auth/callback?code=abc')).toBe(DEFAULT_AFTER_LOGIN);
  });
});

/**
 * The platform is reached through a rewrite from the static site, so the URL
 * a route handler sees is not always the URL the person is looking at. Getting
 * this wrong sends someone to the wrong domain right after they sign in — and
 * their session cookie is not on that domain, so they land signed out.
 */
describe('resolveCallbackOrigin', () => {
  const allowedHosts = ['kauaramos.com', 'wwconnect.com.br', 'localhost:3000'];
  const requestOrigin = 'https://wwc-landing-abc.vercel.app';

  it('uses the request origin when nothing was forwarded', () => {
    expect(resolveCallbackOrigin({ requestOrigin, allowedHosts })).toBe(requestOrigin);
  });

  it('honours a forwarded host we answer on', () => {
    expect(
      resolveCallbackOrigin({
        requestOrigin,
        forwardedHost: 'kauaramos.com',
        forwardedProto: 'https',
        allowedHosts,
      }),
    ).toBe('https://kauaramos.com');
  });

  it('keeps the port, which is the whole of local development', () => {
    expect(
      resolveCallbackOrigin({
        requestOrigin: 'http://127.0.0.1:3000',
        forwardedHost: 'localhost:3000',
        forwardedProto: 'http',
        allowedHosts,
      }),
    ).toBe('http://localhost:3000');
  });

  it('takes the first hop when a chain of proxies appended their own', () => {
    expect(
      resolveCallbackOrigin({
        requestOrigin,
        forwardedHost: 'kauaramos.com, internal.vercel',
        forwardedProto: 'https, http',
        allowedHosts,
      }),
    ).toBe('https://kauaramos.com');
  });

  it('trusts any preview deployment of this project', () => {
    expect(
      resolveCallbackOrigin({
        requestOrigin,
        forwardedHost: 'wwc-landing-git-feat.vercel.app',
        allowedHosts,
      }),
    ).toBe('https://wwc-landing-git-feat.vercel.app');
  });

  it('ignores a host header somebody made up', () => {
    for (const forwardedHost of [
      'evil.com',
      'kauaramos.com.evil.com',
      'evil.com/kauaramos.com',
      'not a host',
      '',
    ]) {
      expect(
        resolveCallbackOrigin({ requestOrigin, forwardedHost, allowedHosts }),
        forwardedHost,
      ).toBe(requestOrigin);
    }
  });

  it('is not fooled by a lookalike of the preview domain', () => {
    expect(
      resolveCallbackOrigin({
        requestOrigin,
        forwardedHost: 'evil-vercel.app',
        allowedHosts,
      }),
    ).toBe(requestOrigin);
  });
});
