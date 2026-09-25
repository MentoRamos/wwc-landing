import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A porta do tick de e-mail: o `pg_cron` chama por POST a cada 5 minutos e o
 * cron da Vercel chama por GET uma vez por dia, os dois com o `CRON_SECRET`.
 * O que o tick faz está em `tests/evento-tick.test.ts`.
 */
const runEmailTick = vi.fn(async () => ({ released: 0, candidates: 1, sent: 1 }));

vi.mock('@/lib/supabase/admin', () => ({ adminClient: () => ({}) }));
vi.mock('@/lib/evento/tick', () => ({ runEmailTick: (...args: unknown[]) => runEmailTick(...(args as [])) }));

const route = await import('@/app/api/cron/evento/route');

const SECRET = 'segredo-do-cron-com-bastante-entropia-0123456789';
const call = (method: 'GET' | 'POST', auth: string | null = `Bearer ${SECRET}`) =>
  new Request('https://site.test/api/cron/evento', { method, headers: auth ? { authorization: auth } : {} });

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET);
  runEmailTick.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe('/api/cron/evento', () => {
  for (const method of ['GET', 'POST'] as const) {
    it(`${method}: 401 sem segredo, com segredo errado e sem CRON_SECRET`, async () => {
      const handler = route[method];
      expect((await handler(call(method, null))).status).toBe(401);
      expect((await handler(call(method, `Bearer ${SECRET}x`))).status).toBe(401);
      vi.stubEnv('CRON_SECRET', '');
      expect((await handler(call(method))).status).toBe(401);
      expect(runEmailTick).not.toHaveBeenCalled();
    });

    it(`${method}: com o segredo, roda o tick e devolve o resumo`, async () => {
      const response = await route[method](call(method));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, email: { released: 0, candidates: 1, sent: 1 } });
      expect(runEmailTick).toHaveBeenCalledTimes(1);
    });
  }

  it('erro inesperado no tick vira 500 sem detalhe', async () => {
    runEmailTick.mockRejectedValueOnce(new Error('fulano@exemplo.com quebrou'));
    const response = await route.POST(call('POST'));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('@');
  });
});
