import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { claimWaJobs, parseWaResult, recordWaOptout, recordWaResult } from '@/lib/evento/wa';

/**
 * A ponte entre a API do worker e o banco, com um Supabase falso que guarda
 * cada `rpc` e cada `update`. As regras de fila (lease, intervalo, teto,
 * ordem, SAIR) são do Postgres e têm teste lá; aqui fica o que o site decide
 * antes de chamar o banco e o texto que ele devolve.
 */
type Call = { fn: string; args: Record<string, unknown> };
type Update = { table: string; fields: Record<string, unknown>; filters: Record<string, unknown> };

const BUYER = '11111111-2222-3333-4444-555555555555';
const row = (over: Record<string, unknown> = {}) => ({
  job_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  buyer_id: BUYER,
  step_key: 't0',
  phone_e164: '+5562999990001',
  first_name: 'Maria',
  purchased_at: '2026-10-05T13:00:00.000Z',
  source: 'sandbox',
  ...over,
});

function fakeAdmin(rows: unknown[] = [row()], rpcResult: unknown = undefined) {
  const calls: Call[] = [];
  const updates: Update[] = [];
  const admin = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === 'claim_wa_jobs') return { data: rows, error: null };
      return { data: rpcResult, error: null };
    },
    from: (table: string) => {
      const state = { fields: {} as Record<string, unknown>, filters: {} as Record<string, unknown> };
      const builder = {
        update(fields: Record<string, unknown>) {
          state.fields = fields;
          return builder;
        },
        eq(column: string, value: unknown) {
          state.filters[column] = value;
          return builder;
        },
        then(resolve: (value: { error: null }) => unknown) {
          updates.push({ table, fields: state.fields, filters: { ...state.filters } });
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
  return { admin, calls, updates };
}

const DAY = new Date('2026-10-05T15:00:00Z'); // 12h em Brasília
const NIGHT = new Date('2026-10-06T01:00:00Z'); // 22h em Brasília
const input = { limit: 1, mode: 'live' as const, dryRun: false, quiet: false };

beforeEach(() => {
  vi.stubEnv('WA_ENABLED', 'true');
  vi.stubEnv('EVENTO_MODE', 'live');
  vi.stubEnv('EVENTO_LINK_SECRET', 'segredo-de-teste-com-bastante-entropia-0123');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://kauaramos.com');
  vi.stubEnv('EVENTO_VIDEOS_URL', 'https://youtube.com/playlist?list=teste');
  vi.stubEnv('EVENTO_ANTIGOS_LIBERADO', '');
  vi.stubEnv('WA_DAILY_CAP', '');
});
afterEach(() => vi.unstubAllEnvs());

const claimArgs = (calls: Call[]) => calls.find((call) => call.fn === 'claim_wa_jobs')!.args;

describe('o kill switch', () => {
  it('sem WA_ENABLED=true o claim devolve vazio e nem chama o banco', async () => {
    for (const value of ['', 'false', '1', 'yes']) {
      vi.stubEnv('WA_ENABLED', value);
      const { admin, calls } = fakeAdmin();
      expect(await claimWaJobs(admin, input, DAY), value).toEqual({ jobs: [] });
      expect(calls).toHaveLength(0);
    }
  });
});

describe('o que o site pede ao banco', () => {
  it('de dia, em live dos dois lados: todos os passos, comprador real liberado, lease de verdade', async () => {
    const { admin, calls } = fakeAdmin();
    await claimWaJobs(admin, input, DAY);
    const args = claimArgs(calls);
    expect(args).toMatchObject({ p_limit: 1, p_real_buyers: true, p_antigos: false, p_daily_cap: 150, p_dry_run: false });
    expect(args.p_now).toBe(DAY.toISOString());
    expect([...(args.p_steps as string[])].sort()).toEqual(
      ['gravacao_incluida', 'gravacao_oferta', 'grupo_convite', 't0', 't0_antigos', 'videos'].sort(),
    );
  });

  it('no silêncio pelo relógio do site, só a T0, mesmo que o worker diga que não', async () => {
    const { admin, calls } = fakeAdmin();
    await claimWaJobs(admin, { ...input, quiet: false }, NIGHT);
    expect(claimArgs(calls).p_steps).toEqual(['t0']);
  });

  it('o worker avisando silêncio também basta', async () => {
    const { admin, calls } = fakeAdmin();
    await claimWaJobs(admin, { ...input, quiet: true }, DAY);
    expect(claimArgs(calls).p_steps).toEqual(['t0']);
  });

  it('comprador real só com o worker em live E o site em live', async () => {
    const cases: Array<[string, string, boolean]> = [
      ['live', 'live', true],
      ['allowlist', 'live', false],
      ['live', '', false],
      ['live', 'sandbox', false],
    ];
    for (const [mode, site, expected] of cases) {
      vi.stubEnv('EVENTO_MODE', site);
      const { admin, calls } = fakeAdmin();
      await claimWaJobs(admin, { ...input, mode: mode as 'live' | 'allowlist' }, DAY);
      expect(claimArgs(calls).p_real_buyers, `${mode}/${site}`).toBe(expected);
    }
  });

  it('dry-run não reserva: vale o dry_run e vale o modo dry-run', async () => {
    for (const body of [
      { ...input, dryRun: true },
      { ...input, mode: 'dry-run' as const, dryRun: false },
    ]) {
      const { admin, calls } = fakeAdmin();
      await claimWaJobs(admin, body, DAY);
      expect(claimArgs(calls).p_dry_run).toBe(true);
    }
  });

  it('o envio aos antigos só com EVENTO_ANTIGOS_LIBERADO=true', async () => {
    vi.stubEnv('EVENTO_ANTIGOS_LIBERADO', 'true');
    const { admin, calls } = fakeAdmin();
    await claimWaJobs(admin, input, DAY);
    expect(claimArgs(calls).p_antigos).toBe(true);
  });

  it('WA_DAILY_CAP chega ao banco, e o limite fica entre 1 e 10', async () => {
    vi.stubEnv('WA_DAILY_CAP', '40');
    const { admin, calls } = fakeAdmin();
    await claimWaJobs(admin, { ...input, limit: 500 }, DAY);
    expect(claimArgs(calls)).toMatchObject({ p_daily_cap: 40, p_limit: 10 });
  });

  it('sem o segredo do link, a T0 espera (ela leva a pesquisa)', async () => {
    vi.stubEnv('EVENTO_LINK_SECRET', '');
    const { admin, calls } = fakeAdmin([]);
    await claimWaJobs(admin, input, DAY);
    expect(claimArgs(calls).p_steps).not.toContain('t0');
  });

  it('link de vídeos que não é https não conta', async () => {
    vi.stubEnv('EVENTO_VIDEOS_URL', 'LINK DOS VIDEOS');
    const { admin, calls } = fakeAdmin([]);
    await claimWaJobs(admin, input, DAY);
    expect(claimArgs(calls).p_steps).not.toContain('videos');
  });
});

describe('o que o site devolve ao worker', () => {
  it('id, telefone só com dígitos, texto e passo', async () => {
    const { admin } = fakeAdmin();
    const { jobs } = await claimWaJobs(admin, input, DAY);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ id: row().job_id, phone: '5562999990001', step_key: 't0' });
    expect(jobs[0].text.startsWith('Maria, aqui é o Kauã Ramos.')).toBe(true);
    expect(jobs[0].text).toMatch(/https:\/\/kauaramos\.com\/imersao\/pesquisa\?t=11111111-2222-3333-4444-555555555555\.[\w-]+/);
    expect(Object.keys(jobs[0]).sort()).toEqual(['id', 'phone', 'step_key', 'text']);
  });

  it('a T0 dos antigos leva a origem na pesquisa', async () => {
    const { admin } = fakeAdmin([row({ step_key: 't0_antigos', source: 'backfill' })]);
    const { jobs } = await claimWaJobs(admin, input, DAY);
    expect(jobs[0].text).toContain('&o=antigos');
    expect(jobs[0].text).toContain('Você garantiu o seu ingresso da imersão');
  });

  it('a variação da T0 vem da data da compra', async () => {
    const { admin } = fakeAdmin([row({ purchased_at: '2026-10-22T13:00:00.000Z' })]);
    const { jobs } = await claimWaJobs(admin, input, DAY);
    expect(jobs[0].text).toContain('tarefa de 7 dias');
  });

  it('nome com colchetes não trava o job (a guarda olha o modelo, não o nome)', async () => {
    const { admin, updates } = fakeAdmin([row({ first_name: '[Ana]' })]);
    const { jobs } = await claimWaJobs(admin, input, DAY);
    expect(jobs).toHaveLength(1);
    expect(updates).toHaveLength(0);
  });

  it('texto com marcador sobrando não sai: o job vira blocked', async () => {
    vi.stubEnv('EVENTO_VIDEOS_URL', 'https://youtube.com/[LINK DOS VIDEOS]');
    const { admin, updates } = fakeAdmin([row({ step_key: 'videos' })]);
    const { jobs } = await claimWaJobs(admin, input, DAY);
    expect(jobs).toHaveLength(0);
    expect(updates).toEqual([
      {
        table: 'message_jobs',
        fields: { status: 'blocked', error: 'placeholder', lease_until: null },
        filters: { id: row().job_id, status: 'claimed' },
      },
    ]);
  });

  it('em dry-run, o job com marcador só some da resposta; nada é gravado', async () => {
    vi.stubEnv('EVENTO_VIDEOS_URL', 'https://youtube.com/[LINK DOS VIDEOS]');
    const { admin, updates } = fakeAdmin([row({ step_key: 'videos' })]);
    const { jobs } = await claimWaJobs(admin, { ...input, dryRun: true }, DAY);
    expect(jobs).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });
});

describe('o resultado do worker', () => {
  const id = 'aaaaaaaa-0000-0000-0000-000000000001';

  it('aceita os quatro status do contrato', () => {
    for (const status of ['sent', 'failed', 'no_whatsapp', 'skipped']) {
      expect(parseWaResult({ id, status }).ok, status).toBe(true);
    }
    expect(parseWaResult({ id, status: 'delivered' }).ok).toBe(false);
    expect(parseWaResult({ id: 'x', status: 'sent' }).ok).toBe(false);
    expect(parseWaResult(null).ok).toBe(false);
  });

  it('motivo, JID e id da mensagem que não têm o formato esperado não passam', () => {
    const parsed = parseWaResult({
      id,
      status: 'failed',
      reason: 'maria@x.com',
      wa_jid: '5562999990001@g.us',
      message_id: 'x'.repeat(300),
    });
    expect(parsed).toEqual({ ok: true, value: { id, status: 'failed' } });
  });

  it('grava pelo banco, idempotente', async () => {
    const { admin, calls } = fakeAdmin([], 'updated');
    const now = new Date('2026-10-05T15:00:00Z');
    const outcome = await recordWaResult(
      admin,
      { id, status: 'sent', wa_jid: '5562999990001@s.whatsapp.net', message_id: 'ABC123' },
      now,
    );
    expect(outcome).toBe('updated');
    expect(calls[0]).toEqual({
      fn: 'evento_wa_result',
      args: {
        p_job: id,
        p_status: 'sent',
        p_reason: null,
        p_jid: '5562999990001@s.whatsapp.net',
        p_message_id: 'ABC123',
        p_now: now.toISOString(),
      },
    });
  });
});

describe('o SAIR', () => {
  it('só um SAIR de verdade vira saída', async () => {
    const { admin, calls } = fakeAdmin([], 0);
    expect(await recordWaOptout(admin, { phone: '5562999990001', text: 'vou sair mais cedo' })).toEqual({
      optout: false,
      canceled: 0,
    });
    expect(calls).toHaveLength(0);
  });

  it('grava as duas formas do número e devolve quantos jobs cancelou', async () => {
    const { admin, calls } = fakeAdmin([], 3);
    expect(await recordWaOptout(admin, { phone: '556299990001@s.whatsapp.net', text: 'Sair.' })).toEqual({
      optout: true,
      canceled: 3,
    });
    expect(calls[0].fn).toBe('evento_wa_optout');
    expect([...(calls[0].args.p_addresses as string[])].sort()).toEqual(['+556299990001', '+5562999990001'].sort());
  });

  it('número ilegível não chama o banco', async () => {
    const { admin, calls } = fakeAdmin([], 0);
    await expect(recordWaOptout(admin, { phone: 'grupo@g.us', text: 'SAIR' })).rejects.toThrow('telefone');
    expect(calls).toHaveLength(0);
  });
});
