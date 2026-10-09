import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TICKET_PRODUCT_ID, RECORDING_PRODUCT_ID } from '@/lib/core/evento.core';

/**
 * O backfill lê as compras que chegaram em `billing_events` antes da
 * automação e passa cada uma pela mesma ponte do webhook, com a agenda de
 * comprador antigo. A ponte tem teste próprio; aqui é a leitura, o que fica
 * de fora e o resumo, que só leva contagens.
 */
const applyEventoEvent = vi.fn<(...args: unknown[]) => Promise<{ result: string }>>(async () => ({ result: 'evento:registrado' }));
vi.mock('@/lib/evento/purchase', () => ({ applyEventoEvent: (...args: unknown[]) => applyEventoEvent(...args) }));

const { runBackfill } = await import('@/lib/evento/backfill');

type Row = { event_type: string; payload: unknown; received_at: string };

function fakeAdmin(rows: Row[]) {
  const ops: unknown[][] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gte', 'order', 'range']) {
    builder[method] = (...args: unknown[]) => {
      ops.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve);
  return { admin: { from: () => builder } as unknown as SupabaseClient, ops };
}

const order = (id: string, email: string, productId = TICKET_PRODUCT_ID, type = 'order_approved'): Row => ({
  event_type: type,
  received_at: '2026-09-30T13:00:00Z',
  payload: { order_id: id, webhook_event_type: type, Customer: { email }, Product: { product_id: productId } },
});

const NOW = new Date('2026-10-05T15:00:00Z');
const SINCE = new Date('2026-09-23T03:00:00Z');

beforeEach(() => {
  applyEventoEvent.mockClear();
  applyEventoEvent.mockResolvedValue({ result: 'evento:registrado' });
});

describe('o backfill', () => {
  it('lê só a Kiwify, desde a data pedida, em ordem de chegada', async () => {
    const { admin, ops } = fakeAdmin([]);
    await runBackfill(admin, { since: SINCE, now: NOW, dryRun: true, excludeEmails: [] });
    expect(ops).toContainEqual(['eq', 'provider', 'kiwify']);
    expect(ops).toContainEqual(['gte', 'received_at', SINCE.toISOString()]);
    expect(ops).toContainEqual(['order', 'received_at', { ascending: true }]);
    // Desempate: sem ele, o `range` pula ou repete evento com o mesmo instante.
    expect(ops).toContainEqual(['order', 'id', { ascending: true }]);
  });

  it('em dry-run só conta, não grava nada', async () => {
    const { admin } = fakeAdmin([order('o1', 'a@x.com'), order('o2', 'b@x.com', RECORDING_PRODUCT_ID)]);
    const out = await runBackfill(admin, { since: SINCE, now: NOW, dryRun: true, excludeEmails: [] });
    expect(applyEventoEvent).not.toHaveBeenCalled();
    expect(out).toMatchObject({ read: 2, register: 1, mark: 1 });
  });

  it('passa cada compra pela ponte do webhook com backfill ligado', async () => {
    const { admin } = fakeAdmin([order('o1', 'a@x.com')]);
    const out = await runBackfill(admin, { since: SINCE, now: NOW, dryRun: false, excludeEmails: [] });
    expect(applyEventoEvent).toHaveBeenCalledTimes(1);
    expect(applyEventoEvent.mock.calls[0][1]).toMatchObject({ now: NOW, backfill: true });
    expect(out.results).toEqual({ 'evento:registrado': 1 });
  });

  it('deixa de fora as compras de teste do Kauã (e-mail da allowlist)', async () => {
    const { admin } = fakeAdmin([order('o1', ' Kaua@X.com '), order('o2', 'b@x.com')]);
    const out = await runBackfill(admin, { since: SINCE, now: NOW, dryRun: false, excludeEmails: ['kaua@x.com'] });
    expect(applyEventoEvent).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ excluded: 1, register: 1 });
  });

  it('ignora produto fora do evento e payload ilegível, contando', async () => {
    const { admin } = fakeAdmin([
      order('o1', 'a@x.com', 'produto-do-circle'),
      { event_type: 'x', payload: null, received_at: '2026-09-30T13:00:00Z' },
    ]);
    const out = await runBackfill(admin, { since: SINCE, now: NOW, dryRun: false, excludeEmails: [] });
    expect(applyEventoEvent).not.toHaveBeenCalled();
    expect(out).toMatchObject({ read: 2, ignored: 1, unreadable: 1 });
  });

  it('o resumo não leva e-mail nem order_id', async () => {
    const { admin } = fakeAdmin([order('ordem-secreta', 'maria@x.com')]);
    const out = await runBackfill(admin, { since: SINCE, now: NOW, dryRun: false, excludeEmails: [] });
    expect(JSON.stringify(out)).not.toMatch(/maria|ordem-secreta/);
  });
});

describe('a data da compra no backfill', () => {
  it('sem data no payload, vale a hora em que o evento chegou, não a de agora', async () => {
    const { admin } = fakeAdmin([order('o1', 'a@x.com')]);
    await runBackfill(admin, { since: SINCE, now: NOW, dryRun: false, excludeEmails: [] });
    expect(applyEventoEvent.mock.calls[0][1]).toMatchObject({ receivedAt: new Date('2026-09-30T13:00:00Z') });
  });
});
