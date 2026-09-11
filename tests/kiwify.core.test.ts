import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  describe as describeKeys,
  interpret,
  readEvent,
  verifySignature,
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
describe('verifySignature', () => {
  const payload = '{"order_status":"paid"}';

  it('accepts a signature made with the same secret and algorithm', () => {
    expect(
      verifySignature({
        payload,
        provided: sign(payload, 'sha1'),
        secret: SECRET,
        algorithm: 'sha1',
      }),
    ).toBe(true);

    expect(
      verifySignature({
        payload,
        provided: sign(payload, 'sha256'),
        secret: SECRET,
        algorithm: 'sha256',
      }),
    ).toBe(true);
  });

  it('refuses a signature made with the other algorithm', () => {
    expect(
      verifySignature({
        payload,
        provided: sign(payload, 'sha256'),
        secret: SECRET,
        algorithm: 'sha1',
      }),
    ).toBe(false);
  });

  it('refuses a signature from a different secret', () => {
    const other = createHmac('sha1', 'outro-segredo').update(payload).digest('hex');
    expect(
      verifySignature({ payload, provided: other, secret: SECRET, algorithm: 'sha1' }),
    ).toBe(false);
  });

  it('refuses when the body changed by a single byte', () => {
    const provided = sign(payload, 'sha1');
    expect(
      verifySignature({
        payload: '{"order_status":"Paid"}',
        provided,
        secret: SECRET,
        algorithm: 'sha1',
      }),
    ).toBe(false);
  });

  it('refuses anything missing, rather than treating absence as permission', () => {
    const provided = sign(payload, 'sha1');
    expect(verifySignature({ payload, provided: null, secret: SECRET, algorithm: 'sha1' })).toBe(false);
    expect(verifySignature({ payload, provided: '', secret: SECRET, algorithm: 'sha1' })).toBe(false);
    expect(verifySignature({ payload, provided, secret: '', algorithm: 'sha1' })).toBe(false);
    expect(verifySignature({ payload: '', provided, secret: SECRET, algorithm: 'sha1' })).toBe(false);
  });

  it('refuses a signature of the wrong length without throwing', () => {
    // timingSafeEqual throws on length mismatch; a crash here would be a 500,
    // and Kiwify retries 500s — an attacker gets a free denial of service.
    expect(() =>
      verifySignature({ payload, provided: 'abc', secret: SECRET, algorithm: 'sha1' }),
    ).not.toThrow();
    expect(
      verifySignature({ payload, provided: 'abc', secret: SECRET, algorithm: 'sha1' }),
    ).toBe(false);
  });

  it('ignores case and surrounding space in the hex it was handed', () => {
    const provided = sign(payload, 'sha1');
    expect(
      verifySignature({
        payload,
        provided: `  ${provided.toUpperCase()} `,
        secret: SECRET,
        algorithm: 'sha1',
      }),
    ).toBe(true);
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
