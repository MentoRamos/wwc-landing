import { describe, expect, it } from 'vitest';
import { routeOnEventHost } from '@/lib/core/host-routing.core';

/**
 * The event gets its own domain pointed at this same app. That domain is a
 * marketing page and nothing else: an allowlist, so a platform route added
 * next month is invisible there by default instead of leaking.
 */
describe('routeOnEventHost', () => {
  it('serves the event at the root, keeping the address bar on /', () => {
    expect(routeOnEventHost('/')).toEqual({ kind: 'rewrite', to: '/connect' });
  });

  it('lets the event pages through', () => {
    expect(routeOnEventHost('/connect')).toEqual({ kind: 'pass' });
    expect(routeOnEventHost('/connect/')).toEqual({ kind: 'pass' });
    expect(routeOnEventHost('/connect/edicoes')).toEqual({ kind: 'pass' });
  });

  it('lets the lead form post, because it lives on the event page', () => {
    expect(routeOnEventHost('/api/lead')).toEqual({ kind: 'pass' });
  });

  it('lets the legal pages through, because that domain collects leads', () => {
    // A form that takes a name and an email needs its privacy policy reachable
    // on the same domain. Blocking them would leave /api/lead posting into a
    // site with no policy a person can actually open.
    expect(routeOnEventHost('/privacidade')).toEqual({ kind: 'pass' });
    expect(routeOnEventHost('/termos')).toEqual({ kind: 'pass' });
  });

  it('hides the platform', () => {
    for (const path of [
      '/circle',
      '/admin',
      '/admin/acessos',
      '/biblioteca',
      '/biblioteca/guia-sono',
      '/inicio',
      '/conta',
      '/protocol',
      '/sem-acesso',
    ]) {
      expect(routeOnEventHost(path), path).toEqual({ kind: 'block' });
    }
  });

  it('hides the door too: the session cookie belongs to the platform domain', () => {
    expect(routeOnEventHost('/entrar')).toEqual({ kind: 'block' });
    expect(routeOnEventHost('/auth/callback')).toEqual({ kind: 'block' });
    expect(routeOnEventHost('/api/auth/sair')).toEqual({ kind: 'block' });
  });

  it('does not let a prefix lookalike through', () => {
    expect(routeOnEventHost('/connect-admin')).toEqual({ kind: 'block' });
    expect(routeOnEventHost('/api/leads')).toEqual({ kind: 'block' });
    expect(routeOnEventHost('/api/lead/export')).toEqual({ kind: 'block' });
  });

  it('blocks any route nobody has written yet', () => {
    expect(routeOnEventHost('/qualquer-coisa-nova')).toEqual({ kind: 'block' });
  });
});
