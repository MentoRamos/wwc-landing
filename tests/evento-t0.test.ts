import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A T0 por e-mail com um Supabase falso: o cliente guarda cada `update` com
 * os filtros, e responde a reserva e a leitura do comprador. O que precisa
 * de Postgres de verdade (a reserva condicionada, o cancelamento) está em
 * `evento-db.test.ts`; aqui fica o que o código grava e o que ele manda.
 */
const sendEmail = vi.fn(async (..._args: unknown[]) => ({ ok: true as const }));
vi.mock('@/lib/email/send', () => ({
  emailConfigured: () => true,
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));
vi.mock('@/lib/email/budget', () => ({ eventoEmailAllowed: async () => true }));

const { sendT0Email } = await import('@/lib/evento/t0');

type Update = { table: string; fields: Record<string, unknown>; filters: Record<string, unknown> };

function fakeAdmin(buyer: Record<string, unknown>) {
  const updates: Update[] = [];
  const job = { id: 'job-1', buyer_id: buyer.id, attempts: 0 };

  const from = (table: string) => {
    const state: { op?: 'update' | 'select'; fields?: Record<string, unknown>; filters: Record<string, unknown> } = {
      filters: {},
    };
    const record = () => {
      if (state.op === 'update') updates.push({ table, fields: state.fields!, filters: { ...state.filters } });
    };
    const builder = {
      update(fields: Record<string, unknown>) {
        state.op = 'update';
        state.fields = fields;
        return builder;
      },
      select() {
        state.op ??= 'select';
        return builder;
      },
      eq(column: string, value: unknown) {
        state.filters[column] = value;
        return builder;
      },
      async maybeSingle() {
        record();
        if (table === 'message_jobs') return { data: state.filters.status === 'pending' ? job : null, error: null };
        return { data: buyer, error: null };
      },
      then(resolve: (value: { error: null }) => unknown) {
        record();
        return Promise.resolve({ error: null }).then(resolve);
      },
    };
    return builder;
  };

  return { admin: { from } as unknown as SupabaseClient, updates };
}

const buyer = (over: Record<string, unknown> = {}) => ({
  id: '11111111-2222-3333-4444-555555555555',
  email_norm: 'maria@x.com',
  first_name: 'Maria',
  status: 'paid',
  purchased_at: '2026-10-05T13:00:00.000Z',
  source: 'webhook',
  ...over,
});

beforeEach(() => {
  sendEmail.mockClear();
  vi.stubEnv('EVENTO_MODE', 'live');
  vi.stubEnv('EVENTO_LINK_SECRET', 'segredo-de-teste-com-bastante-entropia-0123');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://kauaramos.com');
});
afterEach(() => vi.unstubAllEnvs());

describe('a reserva da T0', () => {
  /**
   * Sem `lease_until`, um job que ficou `claimed` porque a função morreu no
   * meio (timeout do `after()`) nunca mais seria visto pelo tick do Marco 3.
   */
  it('grava claimed com lease de 10 minutos', async () => {
    const now = new Date('2026-10-05T13:00:00.000Z');
    const { admin, updates } = fakeAdmin(buyer());
    await sendT0Email(admin, 'job-1', now);

    const claim = updates[0];
    expect(claim.filters).toMatchObject({ id: 'job-1', status: 'pending' });
    expect(claim.fields).toEqual({
      status: 'claimed',
      claimed_at: '2026-10-05T13:00:00.000Z',
      lease_until: '2026-10-05T13:10:00.000Z',
    });
  });

  it('solta o lease quando termina, enviado ou devolvido para pendente', async () => {
    const sent = fakeAdmin(buyer());
    expect(await sendT0Email(sent.admin, 'job-1')).toBe('sent');
    expect(sent.updates.at(-1)!.fields).toMatchObject({ status: 'sent', lease_until: null });

    vi.stubEnv('EVENTO_MODE', '');
    const deferred = fakeAdmin(buyer());
    expect(await sendT0Email(deferred.admin, 'job-1')).toBe('deferred');
    expect(deferred.updates.at(-1)!.fields).toMatchObject({ status: 'pending', lease_until: null });
  });
});
