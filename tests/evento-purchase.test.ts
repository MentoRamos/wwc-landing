import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { applyEventoEvent } from '@/lib/evento/purchase';
import { RECORDING_PRODUCT_ID, TICKET_PRODUCT_ID } from '@/lib/core/evento.core';
import type { KiwifyEvent } from '@/lib/core/kiwify.core';

/**
 * A ponte do webhook para as funções do banco, com um cliente falso que só
 * grava o que recebeu. O efeito no Postgres é de `evento-db.test.ts`; aqui
 * fica o que a ponte decide antes de chamar: que data vai como a da compra
 * e o que o `result` do `billing_events` diz sobre ela.
 */
type Call = { fn: string; args: Record<string, unknown> };

function fakeAdmin(reply: (fn: string) => unknown) {
  const calls: Call[] = [];
  const admin = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return { data: reply(fn), error: null };
    },
  } as unknown as SupabaseClient;
  return { admin, calls };
}

const registered = () => [{ buyer_id: 'b1', created: true, t0_email_job_id: 'j1' }];
const event = (productId: string): KiwifyEvent => ({
  id: 'ord-1',
  type: 'order_approved',
  email: 'a@x.com',
  productId,
  subscriptionId: 'ord-1',
});
const now = new Date('2026-10-05T15:00:00Z');

describe('a data da compra que vai para o banco', () => {
  it('é o `approved_date`, e o resultado não ganha marca', async () => {
    const { admin, calls } = fakeAdmin(registered);
    const out = await applyEventoEvent(admin, {
      event: event(TICKET_PRODUCT_ID),
      payload: { approved_date: '2026-10-05 10:00', created_at: '2026-10-05 09:58' },
      now,
    });
    expect(calls[0].args.p_purchased_at).toBe('2026-10-05T13:00:00.000Z');
    expect(out.result).toBe('evento:registrado');
  });

  it('sem `approved_date`, é o `created_at`, e o resultado diz que foi inferida', async () => {
    const { admin, calls } = fakeAdmin(registered);
    const out = await applyEventoEvent(admin, {
      event: event(TICKET_PRODUCT_ID),
      payload: { created_at: '2026-09-24 14:00' },
      now,
    });
    expect(calls[0].args.p_purchased_at).toBe('2026-09-24T17:00:00.000Z');
    expect(calls[0].args.p_includes_recording).toBe(true);
    expect(out.result).toBe('evento:registrado:data=created_at');
  });

  it('sem nenhuma das duas, é o agora, e o resultado diz isso', async () => {
    const { admin, calls } = fakeAdmin(registered);
    const out = await applyEventoEvent(admin, { event: event(TICKET_PRODUCT_ID), payload: {}, now });
    expect(calls[0].args.p_purchased_at).toBe(now.toISOString());
    expect(out.result).toBe('evento:registrado:data=now');
  });

  it('a marcação da gravação usa a mesma regra', async () => {
    const { admin, calls } = fakeAdmin(() => 1);
    const out = await applyEventoEvent(admin, {
      event: event(RECORDING_PRODUCT_ID),
      payload: { created_at: '2026-10-05 09:00' },
      now,
    });
    expect(calls[0].args.p_at).toBe('2026-10-05T12:00:00.000Z');
    expect(out.result).toBe('evento:recording:1:data=created_at');
  });
});

describe('o backfill', () => {
  it('registra com source backfill e a agenda de comprador antigo', async () => {
    const { admin, calls } = fakeAdmin(registered);
    await applyEventoEvent(admin, {
      event: event(TICKET_PRODUCT_ID),
      payload: { approved_date: '2026-09-30 10:00' },
      now,
      backfill: true,
    });
    expect(calls[0].args.p_source).toBe('backfill');
    const steps = (calls[0].args.p_jobs as Array<{ channel: string; step_key: string; due_at: string }>).map(
      (job) => `${job.channel}:${job.step_key}`,
    );
    expect(steps).toContain('whatsapp:t0_antigos');
    expect(steps).not.toContain('whatsapp:t0');
    expect(steps).not.toContain('whatsapp:grupo_convite');
  });

  it('não devolve a T0 para envio imediato: quem manda é o tick, depois do OK', async () => {
    const { admin } = fakeAdmin(registered);
    const out = await applyEventoEvent(admin, {
      event: event(TICKET_PRODUCT_ID),
      payload: { approved_date: '2026-09-30 10:00' },
      now,
      backfill: true,
    });
    expect(out.t0JobId).toBeUndefined();
  });

  it('sem a opção, continua webhook', async () => {
    const { admin, calls } = fakeAdmin(registered);
    await applyEventoEvent(admin, { event: event(TICKET_PRODUCT_ID), payload: {}, now });
    expect(calls[0].args.p_source).toBe('webhook');
  });
});
