/**
 * What a Kiwify webhook means, decided with no network and no database.
 *
 * Kiwify's documentation lists the events and mentions a `token`, but does not
 * say which algorithm signs the body or whether the signature arrives in a
 * header or the query string. Rather than guess and ship something that
 * silently accepts everything, the algorithm is a parameter and the route
 * passes whatever was configured — so when a real test event is captured, one
 * environment variable pins it down and these tests still hold.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Product } from './admin.core';

export type SignatureAlgorithm = 'sha1' | 'sha256';

/**
 * Constant-time comparison of the body's HMAC against what arrived.
 *
 * Fails closed on everything: a missing signature, a missing secret, an empty
 * body, the wrong length. The length case matters more than it looks —
 * `timingSafeEqual` throws when the buffers differ in size, and an uncaught
 * throw here is a 500, which Kiwify retries. That turns a malformed request
 * into a free denial of service.
 */
export function verifySignature(input: {
  payload: string;
  provided: string | null | undefined;
  secret: string;
  algorithm: SignatureAlgorithm;
}): boolean {
  const provided = input.provided?.trim().toLowerCase();
  if (!provided || !input.secret || !input.payload) return false;

  const expected = createHmac(input.algorithm, input.secret)
    .update(input.payload, 'utf8')
    .digest('hex');

  if (provided.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));
}

export type KiwifyEventType =
  | 'order_approved'
  | 'order_refunded'
  | 'chargeback'
  | 'subscription_renewed'
  | 'subscription_canceled'
  | 'subscription_late'
  | 'order_created';

/** The handful of fields we actually read, already pulled out of the payload. */
export type KiwifyEvent = {
  id: string;
  type: KiwifyEventType;
  email: string;
  productId: string;
  subscriptionId: string;
  periodEnd?: string;
};

export type Decision =
  | {
      kind: 'grant';
      email: string;
      product: Product;
      expiresAt: Date;
      externalId: string;
      status: 'active' | 'past_due';
    }
  | { kind: 'revoke'; email: string; product: Product; externalId: string }
  | { kind: 'ignore'; reason: string };

const REVOKES: ReadonlySet<string> = new Set(['order_refunded', 'chargeback']);

/**
 * `order_approved` and `subscription_renewed` both mean the same thing to us —
 * paid through this date — so both land on the same grant and the same row.
 *
 * `subscription_canceled` is the one worth reading twice. Kauã decided that
 * cancelling keeps what was already paid for, and `active_products()` only
 * accepts 'active' and 'past_due'. Writing status 'canceled' here would cut
 * someone off in the middle of a month they paid for, so a cancellation is
 * treated as "paid until the period end and no further" — exactly the row a
 * renewal would have written, minus the next renewal that will not come.
 */
const GRANTS: ReadonlyMap<string, 'active' | 'past_due'> = new Map([
  ['order_approved', 'active'],
  ['subscription_renewed', 'active'],
  ['subscription_canceled', 'active'],
  ['subscription_late', 'past_due'],
]);

export function interpret(input: {
  event: KiwifyEvent;
  productFor: (externalProductId: string) => Product | undefined;
  now: Date;
}): Decision {
  const { event, productFor, now } = input;

  const email = event.email?.trim().toLowerCase();
  if (!email) return { kind: 'ignore', reason: 'evento sem e-mail' };

  const product = productFor(event.productId);
  if (!product) {
    return { kind: 'ignore', reason: `produto fora da plataforma: ${event.productId}` };
  }

  if (REVOKES.has(event.type)) {
    return { kind: 'revoke', email, product, externalId: event.subscriptionId };
  }

  const status = GRANTS.get(event.type);
  if (!status) return { kind: 'ignore', reason: `evento não tratado: ${event.type}` };

  const expiresAt = readPeriodEnd(event.periodEnd);
  if (!expiresAt) {
    return { kind: 'ignore', reason: 'fim de período ausente ou ilegível' };
  }
  if (expiresAt <= now) {
    return { kind: 'ignore', reason: 'fim de período já passou' };
  }

  return { kind: 'grant', email, product, expiresAt, externalId: event.subscriptionId, status };
}

/**
 * A missing or malformed period end must never become `null`.
 *
 * `expires_at IS NULL` is what a Protocol student holds for life. Reaching it
 * through a webhook nobody read would quietly hand a monthly subscriber the
 * same thing, and nothing would ever flag it.
 */
function readPeriodEnd(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Pulls the fields we need out of a payload whose shape is not documented.
 *
 * Kiwify's docs list event names but not the body, and the body differs
 * between a one-off order and a subscription. So this looks in the handful of
 * places each field plausibly lives instead of asserting one shape, and
 * returns null rather than a half-filled event when it cannot find them.
 *
 * The route logs `describe()` on a null, which names the *keys* it saw and
 * never a value — the payload carries a buyer's name, email and document
 * number, and none of that belongs in a log.
 */
export function readEvent(payload: unknown): KiwifyEvent | null {
  if (!payload || typeof payload !== 'object') return null;

  const id =
    str(pick(payload, 'order_id')) ??
    str(pick(payload, 'id')) ??
    str(pick(payload, 'webhook_event_id')) ??
    str(pick(payload, 'event_id'));

  const type = (str(pick(payload, 'webhook_event_type')) ??
    str(pick(payload, 'event_type')) ??
    str(pick(payload, 'type'))) as KiwifyEventType | undefined;

  const email =
    str(pick(payload, 'Customer', 'email')) ??
    str(pick(payload, 'customer', 'email')) ??
    str(pick(payload, 'email')) ??
    '';

  const productId =
    str(pick(payload, 'Product', 'product_id')) ??
    str(pick(payload, 'product', 'id')) ??
    str(pick(payload, 'product_id')) ??
    str(pick(payload, 'Subscription', 'plan', 'product_id')) ??
    '';

  const subscriptionId =
    str(pick(payload, 'Subscription', 'id')) ?? str(pick(payload, 'subscription_id')) ?? id ?? '';

  const periodEnd =
    str(pick(payload, 'Subscription', 'next_payment')) ??
    str(pick(payload, 'Subscription', 'current_period_end')) ??
    str(pick(payload, 'next_payment')) ??
    str(pick(payload, 'access_until'));

  if (!id || !type) return null;
  return { id, type, email, productId, subscriptionId, periodEnd };
}

/** Walks a path through a value of unknown shape without ever asserting one. */
function pick(source: unknown, ...path: string[]): unknown {
  let cursor = source;
  for (const key of path) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor;
}

/** The keys a payload carried, and nothing it contained. Safe to log. */
export function describe(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return `<${typeof payload}>`;
  return Object.keys(payload as object).sort().join(',');
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return String(value);
  return undefined;
}
