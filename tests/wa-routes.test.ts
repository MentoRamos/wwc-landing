import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * As três rotas do worker de WhatsApp: autenticação, corpo e resposta. O
 * que cada uma faz com o banco está em `tests/evento-wa.test.ts`; aqui o
 * `lib/evento/wa` é falso e o que importa é a porta.
 */
const claimWaJobs = vi.fn(async () => ({ jobs: [{ id: 'j1', phone: '5562999990001', text: 'oi', step_key: 't0' }] }));
const recordWaResult = vi.fn(async () => 'updated' as 'updated' | 'noop' | 'not_found');
const recordWaOptout = vi.fn(async () => ({ optout: true, canceled: 2 }));

vi.mock('@/lib/supabase/admin', () => ({ adminClient: () => ({}) }));
vi.mock('@/lib/evento/wa', async (original) => ({
  ...(await original<typeof import('@/lib/evento/wa')>()),
  claimWaJobs: (...args: unknown[]) => claimWaJobs(...(args as [])),
  recordWaResult: (...args: unknown[]) => recordWaResult(...(args as [])),
  recordWaOptout: (...args: unknown[]) => recordWaOptout(...(args as [])),
}));

const claim = await import('@/app/api/wa/claim/route');
const result = await import('@/app/api/wa/result/route');
const optout = await import('@/app/api/wa/optout/route');

const TOKEN = 'token-do-worker-com-bastante-entropia-0123456789';
const post = (body: unknown, auth: string | null = `Bearer ${TOKEN}`) =>
  new Request('https://site.test/api/wa/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.stubEnv('WA_WORKER_TOKEN', TOKEN);
  claimWaJobs.mockClear();
  recordWaResult.mockClear();
  recordWaOptout.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

const routes = [
  ['claim', claim.POST, { limit: 1, mode: 'live', dry_run: false, quiet: false }],
  ['result', result.POST, { id: 'aaaaaaaa-0000-0000-0000-000000000001', status: 'sent' }],
  ['optout', optout.POST, { phone: '5562999990001', text: 'SAIR' }],
] as const;

describe('a autenticação', () => {
  for (const [name, handler, body] of routes) {
    it(`${name}: 401 sem token, com token errado e sem WA_WORKER_TOKEN configurado`, async () => {
      expect((await handler(post(body, null))).status).toBe(401);
      expect((await handler(post(body, `Bearer ${TOKEN}x`))).status).toBe(401);
      expect((await handler(post(body, TOKEN))).status).toBe(401);
      vi.stubEnv('WA_WORKER_TOKEN', '');
      expect((await handler(post(body))).status).toBe(401);
      expect(claimWaJobs).not.toHaveBeenCalled();
      expect(recordWaResult).not.toHaveBeenCalled();
      expect(recordWaOptout).not.toHaveBeenCalled();
    });

    it(`${name}: 400 com corpo que não é JSON ou fora do contrato`, async () => {
      expect((await handler(post('{'))).status).toBe(400);
      expect((await handler(post({ nada: true }))).status).toBe(400);
    });
  }
});

describe('POST /api/wa/claim', () => {
  it('devolve os jobs e passa o corpo traduzido', async () => {
    const response = await claim.POST(post({ limit: 1, mode: 'allowlist', dry_run: false, quiet: true }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      jobs: [{ id: 'j1', phone: '5562999990001', text: 'oi', step_key: 't0' }],
    });
    expect(claimWaJobs).toHaveBeenCalledWith(expect.anything(), { limit: 1, mode: 'allowlist', dryRun: false, quiet: true });
  });

  it('sem dry_run no corpo, o padrão é não reservar', async () => {
    await claim.POST(post({ mode: 'live' }));
    expect(claimWaJobs).toHaveBeenCalledWith(expect.anything(), { limit: 1, mode: 'live', dryRun: true, quiet: false });
  });

  it('falha do banco vira 500 sem detalhe', async () => {
    claimWaJobs.mockRejectedValueOnce(new Error('claim_wa_jobs: 42883'));
    const response = await claim.POST(post({ mode: 'live', dry_run: false }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false });
  });
});

describe('POST /api/wa/result', () => {
  it('200 quando grava ou quando já estava gravado (idempotente)', async () => {
    expect((await result.POST(post(routes[1][2]))).status).toBe(200);
    recordWaResult.mockResolvedValueOnce('noop');
    const again = await result.POST(post(routes[1][2]));
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ ok: true, outcome: 'noop' });
  });

  it('404 para job que não existe', async () => {
    recordWaResult.mockResolvedValueOnce('not_found');
    expect((await result.POST(post(routes[1][2]))).status).toBe(404);
  });
});

describe('POST /api/wa/optout', () => {
  it('devolve se virou saída e quantos jobs cancelou', async () => {
    const response = await optout.POST(post(routes[2][2]));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, optout: true, canceled: 2 });
  });

  it('telefone ilegível é 400', async () => {
    recordWaOptout.mockRejectedValueOnce(new Error('telefone ilegível'));
    expect((await optout.POST(post({ phone: 'x@g.us', text: 'SAIR' }))).status).toBe(400);
  });
});
