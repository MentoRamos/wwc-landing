import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  describe as describeKeys,
  describeMode,
  detectSignature,
  interpret,
  isActionable,
  readEvent,
  type KiwifyEvent,
} from '@/lib/core/kiwify.core';

const SECRET = 'segredo-do-webhook';
const sign = (payload: string, algorithm: 'sha1' | 'sha256') =>
  createHmac(algorithm, SECRET).update(payload).digest('hex');

/**
 * Without this the endpoint is "give me access" open on the internet: anyone
 * posts a JSON that looks like an approved order and walks away owning the
 * Library.
 *
 * Kiwify does not document the algorithm, so it is a parameter rather than a
 * guess baked into the code. These tests pin the property that matters no
 * matter which one turns out to be right: it fails closed on everything that
 * is not an exact match.
 */
describe('detectSignature', () => {
  const payload = '{"order_status":"paid"}';

  /**
   * Kiwify não documenta como assina: nem o algoritmo, nem onde a assinatura
   * viaja, nem se é assinatura de verdade ou só um segredo repetido na URL.
   * Adivinhar por variável de ambiente significava descobrir o erro no dia da
   * primeira venda, com o dinheiro já movido e o acesso não concedido.
   *
   * Então a verificação tenta as formas plausíveis e diz **qual** casou. Isso
   * não afrouxa nada: toda forma continua exigindo o segredo, e nenhuma delas
   * é aceita por ausência.
   */
  it('reconhece o HMAC sha1 e diz que foi ele', () => {
    expect(detectSignature({ payload, provided: sign(payload, 'sha1'), secret: SECRET })).toEqual({
      kind: 'hmac',
      algorithm: 'sha1',
    });
  });

  it('reconhece o HMAC sha256 e diz que foi ele', () => {
    expect(detectSignature({ payload, provided: sign(payload, 'sha256'), secret: SECRET })).toEqual({
      kind: 'hmac',
      algorithm: 'sha256',
    });
  });

  /**
   * A doc da Kiwify fala em "token", e há painel que manda o próprio segredo
   * na query em vez de assinar o corpo. É proteção mais fraca, mas é a que o
   * provedor oferece: recusar isso seria recusar a venda. Fica registrado qual
   * modo foi aceito para a decisão ser visível depois.
   */
  it('aceita o segredo repetido como token, e diz que foi esse o modo', () => {
    expect(detectSignature({ payload, provided: SECRET, secret: SECRET })).toEqual({
      kind: 'shared-token',
    });
  });

  it('recusa assinatura feita com outro segredo', () => {
    const outro = createHmac('sha1', 'outro-segredo').update(payload).digest('hex');
    expect(detectSignature({ payload, provided: outro, secret: SECRET })).toBeNull();
  });

  it('recusa quando o corpo mudou um único byte', () => {
    const provided = sign(payload, 'sha1');
    expect(
      detectSignature({ payload: '{"order_status":"Paid"}', provided, secret: SECRET }),
    ).toBeNull();
  });

  it('recusa o que falta, em vez de tratar ausência como permissão', () => {
    const provided = sign(payload, 'sha1');
    expect(detectSignature({ payload, provided: null, secret: SECRET })).toBeNull();
    expect(detectSignature({ payload, provided: '', secret: SECRET })).toBeNull();
    expect(detectSignature({ payload, provided, secret: '' })).toBeNull();
    expect(detectSignature({ payload: '', provided, secret: SECRET })).toBeNull();
  });

  it('recusa assinatura de comprimento errado sem estourar', () => {
    // timingSafeEqual estoura quando os tamanhos diferem, e um throw aqui é
    // 500. A Kiwify repete 500, então virava negação de serviço de graça.
    expect(() => detectSignature({ payload, provided: 'abc', secret: SECRET })).not.toThrow();
    expect(detectSignature({ payload, provided: 'abc', secret: SECRET })).toBeNull();
  });

  it('recusa um prefixo do HMAC correto', () => {
    const provided = sign(payload, 'sha1').slice(0, 20);
    expect(detectSignature({ payload, provided, secret: SECRET })).toBeNull();
  });

  it('ignora caixa e espaço no hex que recebeu', () => {
    const provided = sign(payload, 'sha1');
    expect(
      detectSignature({ payload, provided: `  ${provided.toUpperCase()} `, secret: SECRET }),
    ).toEqual({ kind: 'hmac', algorithm: 'sha1' });
  });

  it('descreve o modo em uma linha, para caber no log e no e-mail de alerta', () => {
    expect(describeMode({ kind: 'hmac', algorithm: 'sha256' })).toBe('hmac-sha256');
    expect(describeMode({ kind: 'shared-token' })).toBe('token');
  });
});

const productFor = (id: string) =>
  ({ 'kiwify-mensal': 'circle', 'kiwify-trimestral': 'circle' } as const)[
    id as 'kiwify-mensal' | 'kiwify-trimestral'
  ];

const now = new Date('2026-09-11T12:00:00.000Z');

const event = (over: Partial<KiwifyEvent> = {}): KiwifyEvent => ({
  id: 'evt-1',
  type: 'order_approved',
  email: 'Alguem@Exemplo.com',
  productId: 'kiwify-mensal',
  subscriptionId: 'sub-1',
  periodEnd: '2026-10-11T12:00:00.000Z',
  ...over,
});

describe('interpret', () => {
  it('grants the product on an approved order, until the end of the paid period', () => {
    expect(interpret({ event: event(), productFor, now })).toEqual({
      kind: 'grant',
      email: 'alguem@exemplo.com',
      product: 'circle',
      expiresAt: new Date('2026-10-11T12:00:00.000Z'),
      externalId: 'sub-1',
      status: 'active',
    });
  });

  it('normalises the address, because that is what the access is matched on', () => {
    const decision = interpret({ event: event({ email: '  UM@EXEMPLO.COM ' }), productFor, now });
    expect(decision).toMatchObject({ email: 'um@exemplo.com' });
  });

  it('pushes the date out on a renewal rather than granting a second row', () => {
    const decision = interpret({
      event: event({ type: 'subscription_renewed', periodEnd: '2026-11-11T12:00:00.000Z' }),
      productFor,
      now,
    });
    expect(decision).toMatchObject({
      kind: 'grant',
      expiresAt: new Date('2026-11-11T12:00:00.000Z'),
      externalId: 'sub-1',
    });
  });

  /**
   * The decision Kauã made: cancelling keeps what was already paid for.
   *
   * So a cancellation must NOT write status 'canceled' — active_products()
   * only accepts 'active' and 'past_due', and that single word would cut
   * somebody off in the middle of a month they paid for.
   */
  it('lets a cancelled subscription run to the end of the paid period', () => {
    const decision = interpret({
      event: event({ type: 'subscription_canceled' }),
      productFor,
      now,
    });
    expect(decision).toEqual({
      kind: 'grant',
      email: 'alguem@exemplo.com',
      product: 'circle',
      expiresAt: new Date('2026-10-11T12:00:00.000Z'),
      externalId: 'sub-1',
      status: 'active',
    });
  });

  it('keeps access during a late payment, which is a grace period not a refusal', () => {
    const decision = interpret({
      event: event({ type: 'subscription_late' }),
      productFor,
      now,
    });
    expect(decision).toMatchObject({ kind: 'grant', status: 'past_due' });
  });

  it('revokes at once on a refund, because the money went back', () => {
    expect(
      interpret({ event: event({ type: 'order_refunded' }), productFor, now }),
    ).toEqual({
      kind: 'revoke',
      email: 'alguem@exemplo.com',
      product: 'circle',
      externalId: 'sub-1',
    });
  });

  it('revokes at once on a chargeback too', () => {
    expect(
      interpret({ event: event({ type: 'chargeback' }), productFor, now }),
    ).toMatchObject({ kind: 'revoke' });
  });

  it('ignores a product that is not ours instead of guessing one', () => {
    const decision = interpret({
      event: event({ productId: 'algum-outro-curso' }),
      productFor,
      now,
    });
    expect(decision).toMatchObject({ kind: 'ignore' });
  });

  it('ignores an event type we do not handle, and says which', () => {
    const decision = interpret({
      event: event({ type: 'order_created' as KiwifyEvent['type'] }),
      productFor,
      now,
    });
    expect(decision).toEqual({ kind: 'ignore', reason: 'evento não tratado: order_created' });
  });

  it('refuses an event with no address, which could never be matched to anyone', () => {
    const decision = interpret({ event: event({ email: '' }), productFor, now });
    expect(decision).toMatchObject({ kind: 'ignore' });
  });

  /**
   * A missing or unreadable period end must not become a lifetime grant.
   * `expires_at IS NULL` is what a Protocol student holds forever; arriving
   * there through a malformed webhook would hand a subscriber the same thing.
   */
  it('never turns a missing period end into a lifetime grant', () => {
    for (const periodEnd of [undefined, '', 'ontem', '2026-13-45T00:00:00Z']) {
      const decision = interpret({ event: event({ periodEnd }), productFor, now });
      expect(decision.kind).toBe('ignore');
    }
  });

  it('refuses a period end already in the past', () => {
    const decision = interpret({
      event: event({ periodEnd: '2026-09-01T12:00:00.000Z' }),
      productFor,
      now,
    });
    expect(decision).toMatchObject({ kind: 'ignore' });
  });
});

describe('readEvent', () => {
  it('reads the subscription shape', () => {
    expect(
      readEvent({
        order_id: 'o-1',
        webhook_event_type: 'order_approved',
        Customer: { email: 'a@x.com', full_name: 'Alguém' },
        Product: { product_id: 'p-1' },
        Subscription: { id: 's-1', next_payment: '2026-10-11T12:00:00Z' },
      }),
    ).toEqual({
      id: 'o-1',
      type: 'order_approved',
      email: 'a@x.com',
      productId: 'p-1',
      subscriptionId: 's-1',
      periodEnd: '2026-10-11T12:00:00Z',
    });
  });

  it('reads the flatter one-off shape, falling back to the order id', () => {
    expect(
      readEvent({
        id: 'o-2',
        event_type: 'order_refunded',
        customer: { email: 'b@x.com' },
        product_id: 'p-2',
      }),
    ).toMatchObject({ id: 'o-2', subscriptionId: 'o-2', productId: 'p-2' });
  });

  /**
   * The account id we put in the checkout link comes back inside
   * `TrackingParameters`, which is the only part of the payload we chose the
   * contents of. Reading it is what turns "paid with one address, signed in
   * with another" from a support message into nothing at all.
   */
  it('reads back the account id we sent in the checkout link', () => {
    expect(
      readEvent({
        order_id: 'o-4',
        webhook_event_type: 'order_approved',
        Customer: { email: 'a@x.com' },
        Product: { product_id: 'p-1' },
        Subscription: { id: 's-4', next_payment: '2026-10-11T12:00:00Z' },
        TrackingParameters: {
          src: null,
          sck: '11111111-2222-3333-4444-555555555555',
          utm_source: null,
        },
      }),
    ).toMatchObject({ userId: '11111111-2222-3333-4444-555555555555' });
  });

  /**
   * `sck` is a query parameter on a public link, so anybody can put anything
   * in it. It is written straight into a uuid column, and a buyer who typed
   * nonsense — or pasted an affiliate's tag — must not make the grant fail.
   * Anything that is not a uuid is simply not an account id, and we fall back
   * to matching by email, which is exactly what happened before this existed.
   */
  it('ignores an sck that is not a uuid rather than trusting it', () => {
    const base = {
      order_id: 'o-5',
      webhook_event_type: 'order_approved',
      Customer: { email: 'a@x.com' },
      Product: { product_id: 'p-1' },
      Subscription: { id: 's-5', next_payment: '2026-10-11T12:00:00Z' },
    };

    for (const sck of ['instagram', '', '   ', 'u-1', '11111111-2222-3333-4444-5555555555']) {
      expect(readEvent({ ...base, TrackingParameters: { sck } })?.userId).toBeUndefined();
    }
  });

  it('returns null rather than a half-filled event', () => {
    expect(readEvent(null)).toBeNull();
    expect(readEvent('{}')).toBeNull();
    expect(readEvent({ Customer: { email: 'a@x.com' } })).toBeNull();
    expect(readEvent({ order_id: 'o-3' })).toBeNull();
  });

  it('describe names the keys and never a value', () => {
    const described = describeKeys({ order_id: 'o-1', Customer: { email: 'alguem@exemplo.com' } });
    expect(described).toBe('Customer,order_id');
    expect(described).not.toContain('alguem');
    expect(described).not.toContain('o-1');
  });
});

/**
 * O silêncio caro: o evento é nosso, foi entendido, e mesmo assim não virou
 * acesso.
 *
 * `order_approved` sem fim de período é o caso mais provável de todos, porque
 * é o PRIMEIRO evento de toda venda. O desenho de ignorar está certo — um
 * `expires_at` nulo seria vitalício, e ninguém compra vitalício por R$247/mês.
 * O defeito é ignorar calado: a resposta é 200, a Kiwify não repete, e quem
 * pagou não tem como saber.
 *
 * `isActionable` separa esse silêncio do outro, que é legítimo: a Kiwify manda
 * muitos tipos de evento que não nos dizem respeito (pix gerado, boleto
 * emitido, compra recusada), e avisar sobre esses afogaria a caixa de entrada
 * exatamente como a sonda sem limitador afogaria.
 */
describe('isActionable', () => {
  it('marca como acionável todo evento que deveria ter virado efeito', () => {
    for (const type of [
      'order_approved',
      'subscription_renewed',
      'subscription_canceled',
      'subscription_late',
      'order_refunded',
      'chargeback',
    ]) {
      expect(isActionable(type)).toBe(true);
    }
  });

  it('não marca o ruído normal da Kiwify', () => {
    for (const type of ['pix_created', 'billet_created', 'order_rejected', 'cart_reminder']) {
      expect(isActionable(type)).toBe(false);
    }
  });

  it('uma compra sem fim de período é ignorada E acionável', () => {
    const decision = interpret({
      event: {
        id: 'evt_1',
        type: 'order_approved',
        email: 'quem@pagou.test',
        productId: 'p1',
        subscriptionId: 'sub_1',
        periodEnd: undefined,
        userId: undefined,
      },
      productFor: () => 'circle',
      now: new Date('2026-09-17T12:00:00Z'),
    });

    expect(decision.kind).toBe('ignore');
    expect(isActionable('order_approved')).toBe(true);
  });
});
