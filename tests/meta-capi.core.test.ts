import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { KiwifyEvent } from '@/lib/core/kiwify.core';
import {
  buildPurchase,
  capiResult,
  normalizePhone,
  readEventTime,
} from '@/lib/core/meta-capi.core';
import { CONVERSION_PRODUCTS, conversionProductFor } from '@/lib/meta/conversion-products';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

const TICKET = 'ac3fc1c0-b78c-11f1-8ef9-6f8516a1cddf';
const PROTOCOL_180 = 'a0361350-b793-11f1-a02f-752fbbcb4576';
const PROTOCOL_90 = '496896f0-b794-11f1-b594-75596ac4e822';

const now = new Date('2026-09-24T15:00:00.000Z');
const nowSeconds = Math.floor(now.getTime() / 1000);

const event = (over: Partial<KiwifyEvent> = {}): KiwifyEvent => ({
  id: 'order-123',
  type: 'order_approved',
  email: '  Alguem@Exemplo.COM ',
  productId: TICKET,
  subscriptionId: 'order-123',
  ...over,
});

/** The shape Kiwify sends for a one-off order, trimmed to what we read. */
const payload = (over: Record<string, unknown> = {}) => ({
  order_id: 'order-123',
  webhook_event_type: 'order_approved',
  order_status: 'paid',
  approved_date: '2026-09-24 10:30',
  Customer: {
    full_name: 'Maria Clara Souza',
    first_name: 'Maria',
    email: '  Alguem@Exemplo.COM ',
    mobile: '+55 (11) 98765-4321',
    ip: '200.100.50.25',
  },
  Product: { product_id: TICKET, product_name: 'Imersão' },
  TrackingParameters: { sck: null, utm_source: 'meta', fbclid: 'IwAR0abc' },
  ...over,
});

const build = (e: KiwifyEvent, p: unknown) => {
  const product = conversionProductFor(e.productId);
  if (!product) throw new Error('fixture product must be a conversion product');
  return buildPurchase({ event: e, payload: p, product, now });
};

describe('conversionProductFor', () => {
  it('knows the ticket and both Protocol plans, with their list prices', () => {
    expect(conversionProductFor(TICKET)).toMatchObject({ value: 97 });
    expect(conversionProductFor(PROTOCOL_180)).toMatchObject({ value: 12600 });
    expect(conversionProductFor(PROTOCOL_90)).toMatchObject({ value: 6900 });
  });

  it('points the ticket at /imersao and the Protocol at /imersao/protocolo', () => {
    expect(conversionProductFor(TICKET)?.sourceUrl).toBe('https://kauaramos.com/imersao');
    expect(conversionProductFor(PROTOCOL_180)?.sourceUrl).toBe('https://kauaramos.com/imersao/protocolo');
    expect(conversionProductFor(PROTOCOL_90)?.sourceUrl).toBe('https://kauaramos.com/imersao/protocolo');
  });

  /**
   * An unknown id must stay unknown. The Circle products live in
   * KIWIFY_PRODUCTS and must keep going down the access path untouched; if
   * one of them matched here it would skip the grant.
   */
  it('does not match anything else', () => {
    expect(conversionProductFor('kiwify-mensal')).toBeUndefined();
    expect(conversionProductFor('')).toBeUndefined();
    expect(Object.keys(CONVERSION_PRODUCTS)).toHaveLength(3);
  });
});

describe('buildPurchase', () => {
  it('builds the Purchase for an approved ticket order, hashing every identifier', () => {
    expect(build(event(), payload())).toEqual({
      kind: 'send',
      body: {
        event_name: 'Purchase',
        event_time: Math.floor(Date.parse('2026-09-24T13:30:00.000Z') / 1000),
        event_id: 'order-123',
        action_source: 'website',
        event_source_url: 'https://kauaramos.com/imersao',
        user_data: {
          em: [sha('alguem@exemplo.com')],
          ph: [sha('5511987654321')],
          fn: [sha('maria')],
          ln: [sha('clara souza')],
          country: [sha('br')],
          fbc: `fb.1.${Date.parse('2026-09-24T13:30:00.000Z')}.IwAR0abc`,
          client_ip_address: '200.100.50.25',
        },
        custom_data: {
          value: 97,
          currency: 'BRL',
          content_name: 'Imersão Performance e Longevidade',
          content_ids: [TICKET],
          content_type: 'product',
        },
      },
    });
  });

  /**
   * The order id is what Meta deduplicates on. It is the same id the
   * idempotency lock uses, so a redelivery that somehow got past the lock
   * would still be counted once.
   */
  it('uses the Kiwify order id as event_id', () => {
    const result = build(event({ id: 'abc-999' }), payload());
    expect(result.kind === 'send' && result.body.event_id).toBe('abc-999');
  });

  it('never carries a raw e-mail, phone, name or document into the body', () => {
    const result = build(event(), payload({ Customer: { ...payload().Customer, CPF: '12345678909' } }));
    const json = JSON.stringify(result);
    for (const raw of ['exemplo', 'Alguem', '98765', 'Maria', 'maria', 'Souza', '12345678909']) {
      expect(json).not.toContain(raw);
    }
  });

  it('prices the Protocol plans from the map and points them at the offer page', () => {
    const r180 = build(event({ productId: PROTOCOL_180 }), payload());
    const r90 = build(event({ productId: PROTOCOL_90 }), payload());
    expect(r180).toMatchObject({
      kind: 'send',
      body: {
        event_source_url: 'https://kauaramos.com/imersao/protocolo',
        custom_data: { value: 12600, currency: 'BRL', content_ids: [PROTOCOL_180] },
      },
    });
    expect(r90).toMatchObject({ body: { custom_data: { value: 6900, content_ids: [PROTOCOL_90] } } });
  });

  it('takes the first name from full_name when first_name is missing', () => {
    const result = build(
      event(),
      payload({ Customer: { full_name: '  JOÃO  Pereira ', email: 'a@x.com' } }),
    );
    expect(result).toMatchObject({
      body: { user_data: { fn: [sha('joão')], ln: [sha('pereira')] } },
    });
  });

  it('leaves out every identifier the payload did not carry, instead of hashing an empty string', () => {
    const result = build(
      event(),
      payload({ Customer: { email: 'a@x.com' }, TrackingParameters: undefined }),
    );
    expect(result.kind).toBe('send');
    if (result.kind !== 'send') return;
    expect(Object.keys(result.body.user_data).sort()).toEqual(['country', 'em']);
  });

  it('keeps fbc, fbp and user agent when the checkout passed them through', () => {
    const result = build(
      event(),
      payload({
        TrackingParameters: { fbc: 'fb.1.1700000000000.XYZ', fbp: 'fb.1.1700000000000.123' },
        Customer: { email: 'a@x.com', user_agent: 'Mozilla/5.0' },
      }),
    );
    expect(result).toMatchObject({
      body: {
        user_data: {
          fbc: 'fb.1.1700000000000.XYZ',
          fbp: 'fb.1.1700000000000.123',
          client_user_agent: 'Mozilla/5.0',
        },
      },
    });
  });

  it('still sends with only a phone', () => {
    const result = build(event({ email: '' }), payload({ Customer: { mobile: '11987654321' } }));
    expect(result).toMatchObject({ kind: 'send', body: { user_data: { ph: [sha('5511987654321')] } } });
  });

  it('skips when there is nothing to match the buyer on', () => {
    expect(build(event({ email: '' }), payload({ Customer: {} }))).toEqual({
      kind: 'skip',
      reason: 'no-user-data',
    });
  });

  /**
   * Only money that actually arrived is a Purchase. Kiwify sends pix gerado,
   * boleto gerado, compra recusada, reembolso and chargeback to the same URL,
   * and counting any of those would teach the ad algorithm to find people who
   * do not pay.
   */
  it('only fires for an approved order', () => {
    for (const type of [
      'pix_created',
      'billet_created',
      'order_rejected',
      'order_refunded',
      'chargeback',
      'waiting_payment',
      'subscription_renewed',
      'subscription_canceled',
      'cart_abandoned',
    ]) {
      expect(build(event({ type: type as KiwifyEvent['type'] }), payload())).toEqual({
        kind: 'skip',
        reason: `event:${type}`,
      });
    }
  });
});

describe('normalizePhone', () => {
  it('keeps digits only and adds Brazil when the country code is missing', () => {
    expect(normalizePhone('+55 (11) 98765-4321')).toBe('5511987654321');
    expect(normalizePhone('11987654321')).toBe('5511987654321');
    expect(normalizePhone('(11) 3456-7890')).toBe('551134567890');
    expect(normalizePhone('5511987654321')).toBe('5511987654321');
  });

  it('returns nothing for an empty or absurd value', () => {
    expect(normalizePhone('')).toBeUndefined();
    expect(normalizePhone('   ')).toBeUndefined();
    expect(normalizePhone('123')).toBeUndefined();
    expect(normalizePhone(undefined)).toBeUndefined();
  });
});

describe('readEventTime', () => {
  it('reads Kiwify dates without a zone as Brasília time', () => {
    expect(readEventTime('2026-09-24 10:30', now)).toBe(Date.parse('2026-09-24T13:30:00Z') / 1000);
    expect(readEventTime('2026-09-24 10:30:15', now)).toBe(Date.parse('2026-09-24T13:30:15Z') / 1000);
  });

  it('honours an explicit zone', () => {
    expect(readEventTime('2026-09-24T12:00:00.000Z', now)).toBe(Date.parse('2026-09-24T12:00:00Z') / 1000);
  });

  /**
   * Meta rejects the whole request for an event_time in the future or more
   * than seven days old. A skewed or stale date must not cost the sale its
   * conversion, so it falls back to the moment we received it.
   */
  it('falls back to now when the date is missing, unreadable, in the future or too old', () => {
    for (const raw of [undefined, '', 'ontem', '2026-09-24 18:00', '2026-09-10 10:00']) {
      expect(readEventTime(raw, now)).toBe(nowSeconds);
    }
  });
});

describe('capiResult', () => {
  it('names the outcome for billing_events.result', () => {
    expect(capiResult({ kind: 'skip', reason: 'event:pix_created' })).toBe('capi:skipped:event:pix_created');
    expect(capiResult({ kind: 'send', body: {} as never }, { ok: true })).toBe('capi:sent');
    expect(capiResult({ kind: 'send', body: {} as never }, { ok: false, code: '400:2804050' })).toBe(
      'capi:failed:400:2804050',
    );
  });
});
