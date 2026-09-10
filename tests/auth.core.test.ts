import { describe, expect, it } from 'vitest';
import { DEFAULT_AFTER_LOGIN, safeNextPath } from '@/lib/core/auth.core';

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
