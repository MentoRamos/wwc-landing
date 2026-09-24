import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventoConfig, surveyUrl } from '@/lib/evento/config';

afterEach(() => vi.unstubAllEnvs());

describe('a configuração do evento', () => {
  it('lê listas separadas por vírgula, sem vazios nem espaços', () => {
    vi.stubEnv('EVENTO_SANDBOX_ALLOWLIST', ' kaua@x.com , ,outro@x.com');
    vi.stubEnv('EVENTO_TEST_PRODUCT_IDS', 'p-1');
    const config = eventoConfig();
    expect(config.sandboxAllowlist).toEqual(['kaua@x.com', 'outro@x.com']);
    expect(config.testProductIds).toEqual(['p-1']);
  });

  it('descarta endereço inválido da allowlist', () => {
    vi.stubEnv('EVENTO_SANDBOX_ALLOWLIST', 'nao-e-email,kaua@x.com');
    expect(eventoConfig().sandboxAllowlist).toEqual(['kaua@x.com']);
  });

  it('segredo curto demais conta como ausente', () => {
    vi.stubEnv('EVENTO_LINK_SECRET', 'curto');
    expect(eventoConfig().linkSecret).toBeUndefined();
    vi.stubEnv('EVENTO_LINK_SECRET', 'x'.repeat(32));
    expect(eventoConfig().linkSecret).toBe('x'.repeat(32));
  });

  it('monta o link da pesquisa no domínio público, com o token e sem e-mail', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://kauaramos.com/');
    const url = surveyUrl('11111111-2222-3333-4444-555555555555', 'y'.repeat(32));
    expect(url).toMatch(/^https:\/\/kauaramos\.com\/imersao\/pesquisa\?t=11111111-2222-3333-4444-555555555555\.[\w-]+$/);
  });
});
