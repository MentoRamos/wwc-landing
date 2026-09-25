import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * O tick de e-mail do evento com um Supabase falso que guarda cada consulta
 * como a lista de métodos chamados. O envio em si (reserva, checagens,
 * Idempotency-Key) é o `sendT0Email`, com teste próprio; aqui é o tick:
 * o que ele devolve para a fila, o que ele escolhe e quando ele para.
 */
const sendT0Email = vi.fn(async (..._args: unknown[]) => 'sent' as string);
const allowed = vi.fn(async () => true);
let configured = true;

vi.mock('@/lib/evento/t0', () => ({ sendT0Email: (...args: unknown[]) => sendT0Email(...args) }));
vi.mock('@/lib/email/budget', () => ({ eventoEmailAllowed: () => allowed() }));
vi.mock('@/lib/email/send', () => ({ emailConfigured: () => configured }));

const { runEmailTick, EMAIL_TEMPLATES } = await import('@/lib/evento/tick');

type Op = [string, ...unknown[]];
type Query = { table: string; ops: Op[] };

function fakeAdmin(candidates: Array<{ id: string; step_key: string }>) {
  const queries: Query[] = [];
  const from = (table: string) => {
    const query: Query = { table, ops: [] };
    queries.push(query);
    const builder: Record<string, unknown> = {};
    for (const method of ['update', 'select', 'eq', 'neq', 'in', 'not', 'lt', 'lte', 'or', 'order', 'limit']) {
      builder[method] = (...args: unknown[]) => {
        query.ops.push([method, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown) => {
      const isUpdate = query.ops.some(([method]) => method === 'update');
      const data = isUpdate ? [{ id: 'x' }] : candidates;
      return Promise.resolve({ data, error: null }).then(resolve);
    };
    return builder;
  };
  return { admin: { from } as unknown as SupabaseClient, queries };
}

const NOW = new Date('2026-10-05T15:00:00Z');
const has = (query: Query, ...op: unknown[]) =>
  query.ops.some((entry) => JSON.stringify(entry) === JSON.stringify(op));

beforeEach(() => {
  sendT0Email.mockClear();
  allowed.mockReset();
  allowed.mockResolvedValue(true);
  configured = true;
  vi.stubEnv('EVENTO_MODE', 'live');
  vi.stubEnv('EVENTO_ANTIGOS_LIBERADO', '');
});
afterEach(() => vi.unstubAllEnvs());

describe('o tick de e-mail', () => {
  it('só a T0 tem modelo no Marco 2', () => {
    expect(Object.keys(EMAIL_TEMPLATES)).toEqual(['t0']);
  });

  /**
   * No e-mail, lease vencido volta para a fila: o Resend tem
   * Idempotency-Key, então tentar de novo não vira dois e-mails. (No
   * WhatsApp é o contrário, e é o claim de lá que cuida.)
   */
  it('devolve para pending o e-mail claimed com lease vencido', async () => {
    const { admin, queries } = fakeAdmin([]);
    const out = await runEmailTick(admin, NOW);
    const release = queries.find((query) => has(query, 'eq', 'status', 'claimed'))!;
    expect(release.table).toBe('message_jobs');
    expect(has(release, 'update', { status: 'pending', lease_until: null, error: 'lease-vencido' })).toBe(true);
    expect(has(release, 'eq', 'channel', 'email')).toBe(true);
    expect(has(release, 'or', `lease_until.is.null,lease_until.lt.${NOW.toISOString()}`)).toBe(true);
    expect(out.released).toBe(1);
  });

  it('passo vencido sem modelo fica pendente, com o motivo', async () => {
    const { admin, queries } = fakeAdmin([]);
    await runEmailTick(admin, NOW);
    const mark = queries.find((query) => has(query, 'update', { error: 'sem-template' }))!;
    expect(has(mark, 'eq', 'status', 'pending')).toBe(true);
    expect(has(mark, 'not', 'step_key', 'in', '(t0)')).toBe(true);
    expect(has(mark, 'lte', 'due_at', NOW.toISOString())).toBe(true);
  });

  it('em live, escolhe os vencidos de quem está pago, sem olhar a origem', async () => {
    const { admin, queries } = fakeAdmin([{ id: 'j1', step_key: 't0' }, { id: 'j2', step_key: 't0' }]);
    const out = await runEmailTick(admin, NOW);
    const pick = queries.find((query) => has(query, 'select', 'id, step_key, event_buyers!inner(status, source)'))!;
    expect(has(pick, 'in', 'step_key', ['t0'])).toBe(true);
    expect(has(pick, 'eq', 'event_buyers.status', 'paid')).toBe(true);
    expect(has(pick, 'eq', 'event_buyers.source', 'sandbox')).toBe(false);
    expect(has(pick, 'neq', 'event_buyers.source', 'backfill')).toBe(true);
    expect(sendT0Email.mock.calls.map((call) => call[1])).toEqual(['j1', 'j2']);
    expect(sendT0Email.mock.calls[0][2]).toBe(NOW);
    expect(out).toMatchObject({ sent: 2, candidates: 2 });
  });

  /**
   * Fora de live, o comprador real nem entra na seleção: o `sendT0Email`
   * devolveria para pending com `modo-sandbox`, e cada tick gastaria uma
   * reserva à toa. Quando o modo vira live, o próximo tick manda a T0 que
   * ficou esperando.
   */
  it('em sandbox, só comprador de teste', async () => {
    vi.stubEnv('EVENTO_MODE', '');
    const { admin, queries } = fakeAdmin([]);
    await runEmailTick(admin, NOW);
    const pick = queries.find((query) => has(query, 'select', 'id, step_key, event_buyers!inner(status, source)'))!;
    expect(has(pick, 'eq', 'event_buyers.source', 'sandbox')).toBe(true);
  });

  it('com o envio aos antigos liberado, o backfill entra', async () => {
    vi.stubEnv('EVENTO_ANTIGOS_LIBERADO', 'true');
    const { admin, queries } = fakeAdmin([]);
    await runEmailTick(admin, NOW);
    const pick = queries.find((query) => has(query, 'select', 'id, step_key, event_buyers!inner(status, source)'))!;
    expect(has(pick, 'neq', 'event_buyers.source', 'backfill')).toBe(false);
  });

  it('para quando a cota compartilhada acaba', async () => {
    allowed.mockResolvedValueOnce(true).mockResolvedValue(false);
    const { admin } = fakeAdmin([{ id: 'j1', step_key: 't0' }, { id: 'j2', step_key: 't0' }, { id: 'j3', step_key: 't0' }]);
    const out = await runEmailTick(admin, NOW);
    expect(sendT0Email).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ sent: 1, quota: 2 });
  });

  it('conta cada desfecho do envio', async () => {
    sendT0Email.mockResolvedValueOnce('deferred').mockResolvedValueOnce('canceled').mockResolvedValueOnce('skipped');
    const { admin } = fakeAdmin([{ id: 'j1', step_key: 't0' }, { id: 'j2', step_key: 't0' }, { id: 'j3', step_key: 't0' }]);
    expect(await runEmailTick(admin, NOW)).toMatchObject({ sent: 0, deferred: 1, canceled: 1, skipped: 1 });
  });

  it('sem Resend configurado, não escolhe nem envia (mas devolve os leases)', async () => {
    configured = false;
    const { admin, queries } = fakeAdmin([{ id: 'j1', step_key: 't0' }]);
    const out = await runEmailTick(admin, NOW);
    expect(sendT0Email).not.toHaveBeenCalled();
    expect(out.skipped_reason).toBe('resend-nao-configurado');
    expect(queries.some((query) => has(query, 'eq', 'status', 'claimed'))).toBe(true);
  });
});
