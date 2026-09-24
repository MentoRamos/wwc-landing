import { afterAll, describe, expect, it } from 'vitest';
import { anonClient, serviceClient, signedInAs, uniqueEmail, userIdFor } from './helpers/local-supabase';

/**
 * A automação do evento contra o Postgres de verdade.
 *
 * Precisa de Docker e `supabase start` (`npm run test:rls`), e por isso fica
 * fora do `npm test`. O que está aqui não dá para provar com texto: que a
 * reentrega não cria segundo comprador nem segundo job, que o reembolso
 * cancela o que ainda não saiu (venha ele com o mesmo `order_id` ou com
 * outro), e que ninguém além do admin lê uma linha dessas tabelas.
 */
const admin = serviceClient();
const created: string[] = [];

const jobs = (purchasedAt: string) => [
  { channel: 'email', step_key: 't0', due_at: purchasedAt },
  { channel: 'whatsapp', step_key: 't0', due_at: purchasedAt },
  { channel: 'whatsapp', step_key: 'gravacao_oferta', due_at: purchasedAt },
];

async function register(orderId: string, email: string, phone: string | null = '+5511987654321') {
  const purchasedAt = new Date().toISOString();
  const { data, error } = await admin.rpc('evento_register_buyer', {
    p_order_id: orderId,
    p_email: email,
    p_first_name: 'Teste',
    p_phone: phone,
    p_purchased_at: purchasedAt,
    p_includes_recording: false,
    p_source: 'sandbox',
    p_jobs: jobs(purchasedAt),
  });
  if (error) throw error;
  const row = (data as Array<{ buyer_id: string; created: boolean; t0_email_job_id: string | null }>)[0];
  created.push(row.buyer_id);
  return row;
}

async function jobsOf(buyerId: string) {
  const { data, error } = await admin.from('message_jobs').select('step_key, channel, status').eq('buyer_id', buyerId);
  if (error) throw error;
  return data;
}

afterAll(async () => {
  if (created.length) await admin.from('event_buyers').delete().in('id', created);
}, 60_000);

describe('o registro do comprador', () => {
  it('uma compra vira um comprador e os jobs dele, com a T0 de e-mail devolvida', async () => {
    const row = await register(`ord-${Date.now()}-a`, uniqueEmail('comprador'));
    expect(row.created).toBe(true);
    expect(row.t0_email_job_id).toBeTruthy();
    expect(await jobsOf(row.buyer_id)).toHaveLength(3);
  });

  it('a reentrega do mesmo pedido não cria nada de novo', async () => {
    const order = `ord-${Date.now()}-b`;
    const email = uniqueEmail('reentrega');
    const first = await register(order, email);
    const second = await register(order, email);
    expect(second.buyer_id).toBe(first.buyer_id);
    expect(second.created).toBe(false);
    expect(await jobsOf(first.buyer_id)).toHaveLength(3);
  });

  it('recusa telefone fora de E.164', async () => {
    await expect(register(`ord-${Date.now()}-c`, uniqueEmail('fone'), '11987654321')).rejects.toBeTruthy();
  });
});

describe('o reembolso e o chargeback', () => {
  it('com o mesmo order_id: marca o comprador e cancela o que está pendente', async () => {
    const order = `ord-${Date.now()}-d`;
    const row = await register(order, uniqueEmail('reembolso'));

    const { data, error } = await admin.rpc('evento_cancel_buyer', {
      p_order_id: order,
      p_email: 'ignorado@teste.local',
      p_status: 'refunded',
    });
    expect(error).toBeNull();
    expect(data[0]).toMatchObject({ buyer_id: row.buyer_id, canceled_jobs: 3, matched_by: 'order_id' });

    const { data: buyer } = await admin.from('event_buyers').select('status').eq('id', row.buyer_id).single();
    expect(buyer!.status).toBe('refunded');
    expect((await jobsOf(row.buyer_id)).every((job) => job.status === 'canceled')).toBe(true);
  });

  it('com outro order_id: acha o comprador pelo e-mail quando só há um', async () => {
    const email = uniqueEmail('chargeback');
    const row = await register(`ord-${Date.now()}-e`, email);

    const { data } = await admin.rpc('evento_cancel_buyer', {
      p_order_id: `outro-${Date.now()}`,
      p_email: email.toUpperCase(),
      p_status: 'chargeback',
    });
    expect(data[0]).toMatchObject({ buyer_id: row.buyer_id, matched_by: 'email' });
  });

  it('antes da aprovação: deixa uma lápide, e a aprovação atrasada não enfileira nada', async () => {
    const order = `ord-${Date.now()}-f`;
    const email = uniqueEmail('fora-de-ordem');
    const { data } = await admin.rpc('evento_cancel_buyer', { p_order_id: order, p_email: email, p_status: 'refunded' });
    expect(data[0]).toMatchObject({ matched_by: 'tombstone', canceled_jobs: 0 });
    created.push(data[0].buyer_id);

    const late = await register(order, email);
    expect(late.created).toBe(false);
    expect(late.t0_email_job_id).toBeNull();
    expect(await jobsOf(late.buyer_id)).toHaveLength(0);
  });
});

describe('o claim do WhatsApp', () => {
  it('não entrega job de quem foi reembolsado nem de quem pediu SAIR', async () => {
    const refundedOrder = `ord-${Date.now()}-g`;
    const refunded = await register(refundedOrder, uniqueEmail('claim-reembolso'), '+5511911110000');
    await admin.rpc('evento_cancel_buyer', { p_order_id: refundedOrder, p_email: 'x@teste.local', p_status: 'refunded' });

    const optedOut = await register(`ord-${Date.now()}-h`, uniqueEmail('claim-sair'), '+5511922220000');
    await admin.from('contact_optouts').insert({ channel: 'whatsapp', address: '+5511922220000', source: 'sair' });

    const { data } = await admin.rpc('claim_wa_jobs', { p_limit: 500, p_now: new Date(Date.now() + 60_000).toISOString() });
    const buyers = new Set((data as Array<{ buyer_id: string }>).map((job) => job.buyer_id));
    expect(buyers.has(refunded.buyer_id)).toBe(false);
    expect(buyers.has(optedOut.buyer_id)).toBe(false);

    await admin.from('contact_optouts').delete().eq('address', '+5511922220000');
    // Devolve o que este teste reservou de outros compradores do próprio arquivo.
    await admin.from('message_jobs').update({ status: 'pending' }).in('buyer_id', created).eq('status', 'claimed');
  });
});

describe('as compras que vêm depois do ingresso', () => {
  it('marcam gravação, reserva e Protocol no comprador pelo e-mail', async () => {
    const email = uniqueEmail('upsell');
    const row = await register(`ord-${Date.now()}-i`, email);
    const at = new Date().toISOString();

    for (const kind of ['recording', 'protocol_deposit', 'protocol']) {
      const { data, error } = await admin.rpc('evento_mark_purchase', { p_email: email, p_kind: kind, p_at: at });
      expect(error).toBeNull();
      expect(data).toBe(1);
    }

    const { data: buyer } = await admin
      .from('event_buyers')
      .select('bought_recording_at, protocol_deposit_at, bought_protocol_at')
      .eq('id', row.buyer_id)
      .single();
    expect(buyer!.bought_recording_at).not.toBeNull();
    expect(buyer!.protocol_deposit_at).not.toBeNull();
    expect(buyer!.bought_protocol_at).not.toBeNull();
  });
});

describe('quem lê as tabelas do evento', () => {
  const tables = ['event_buyers', 'message_jobs', 'contact_optouts', 'survey_responses', 'protocol_applications'];

  it('um estranho com a chave pública não lê nada', async () => {
    for (const table of tables) {
      const { data } = await anonClient().from(table).select('*');
      expect(data ?? [], table).toHaveLength(0);
    }
  });

  it('um membro comum não lê nada e não escreve nada', async () => {
    await register(`ord-${Date.now()}-j`, uniqueEmail('visivel'));
    const client = await signedInAs(uniqueEmail('membro-evento'));
    for (const table of tables) {
      const { data } = await client.from(table).select('*');
      expect(data ?? [], table).toHaveLength(0);
    }
    const { error } = await client.from('contact_optouts').insert({ channel: 'email', address: 'a@b.c', source: 'admin' });
    expect(error).not.toBeNull();
    const rpc = await client.rpc('claim_wa_jobs', { p_limit: 1, p_now: new Date().toISOString() });
    expect(rpc.error).not.toBeNull();
  });

  it('o admin lê', async () => {
    await register(`ord-${Date.now()}-k`, uniqueEmail('lido'));
    const email = uniqueEmail('admin-evento');
    const client = await signedInAs(email);
    await admin.from('admin_users').insert({ user_id: await userIdFor(email) });
    const { data } = await client.from('event_buyers').select('id').in('id', created);
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});
