/**
 * The server-side Purchase for Meta's Conversions API, decided with no
 * network and no database.
 *
 * Why it exists: the browser pixel waits for the LGPD consent banner, so a
 * buyer who picks "Só o essencial" never produces a Purchase and the ad
 * account optimises on a fraction of the sales. The Kiwify webhook sees every
 * approved order, so the server becomes the one source of truth for sales.
 *
 * What leaves here: every identifier is normalised and SHA-256 hashed, as
 * Meta requires. The only values that travel in the clear are the ones Meta
 * cannot match hashed (fbc, fbp, IP, user agent), and only when the checkout
 * actually passed them through.
 */

import { createHash } from 'node:crypto';
import type { KiwifyEvent } from './kiwify.core';
import type { ConversionProduct } from '@/lib/meta/conversion-products';

export type CapiUserData = {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  country: string[];
  fbc?: string;
  fbp?: string;
  client_ip_address?: string;
  client_user_agent?: string;
};

export type CapiEvent = {
  event_name: 'Purchase';
  event_time: number;
  event_id: string;
  action_source: 'website';
  event_source_url: string;
  user_data: CapiUserData;
  custom_data: {
    value: number;
    currency: 'BRL';
    content_name: string;
    content_ids: string[];
    content_type: 'product';
  };
};

export type PurchaseDecision = { kind: 'send'; body: CapiEvent } | { kind: 'skip'; reason: string };

export type SendResult = { ok: true } | { ok: false; code: string };

/**
 * Only an approved order is money that arrived. Everything else Kiwify sends
 * to the same URL (pix gerado, boleto, recusa, reembolso, chargeback) is
 * skipped: counting it would teach the ad algorithm to find people who do not
 * pay. The name is the one `kiwify.core` already proved against a real
 * purchase on 22/09.
 */
const PURCHASE_EVENTS: ReadonlySet<string> = new Set(['order_approved']);

/** Meta refuses an event_time older than this, and one in the future. */
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function buildPurchase(input: {
  event: KiwifyEvent;
  payload: unknown;
  product: ConversionProduct;
  now: Date;
}): PurchaseDecision {
  const { event, payload, product, now } = input;

  if (!PURCHASE_EVENTS.has(event.type)) return { kind: 'skip', reason: `event:${event.type}` };

  const eventTime = readEventTime(str(pick(payload, 'approved_date')), now);

  const email = (event.email || str(pick(payload, 'Customer', 'email')) || '').trim().toLowerCase();
  const phone = normalizePhone(str(pick(payload, 'Customer', 'mobile')) ?? str(pick(payload, 'Customer', 'phone')));
  if (!email && !phone) return { kind: 'skip', reason: 'no-user-data' };

  const { first, last } = readNames(
    str(pick(payload, 'Customer', 'first_name')),
    str(pick(payload, 'Customer', 'full_name')),
  );

  const tracking = (key: string) =>
    str(pick(payload, 'TrackingParameters', key)) ?? str(pick(payload, 'tracking_parameters', key));

  const fbclid = tracking('fbclid');
  const fbc = tracking('fbc') ?? (fbclid ? `fb.1.${eventTime * 1000}.${fbclid}` : undefined);
  const fbp = tracking('fbp');
  const ip = str(pick(payload, 'Customer', 'ip')) ?? str(pick(payload, 'client_ip'));
  const userAgent = str(pick(payload, 'Customer', 'user_agent')) ?? str(pick(payload, 'user_agent'));

  const user_data: CapiUserData = {
    ...(email ? { em: [sha256(email)] } : {}),
    ...(phone ? { ph: [sha256(phone)] } : {}),
    ...(first ? { fn: [sha256(first)] } : {}),
    ...(last ? { ln: [sha256(last)] } : {}),
    country: [sha256('br')],
    ...(fbc ? { fbc } : {}),
    ...(fbp ? { fbp } : {}),
    ...(ip ? { client_ip_address: ip } : {}),
    ...(userAgent ? { client_user_agent: userAgent } : {}),
  };

  return {
    kind: 'send',
    body: {
      event_name: 'Purchase',
      event_time: eventTime,
      event_id: event.id,
      action_source: 'website',
      event_source_url: product.sourceUrl,
      user_data,
      custom_data: {
        value: product.value,
        currency: 'BRL',
        content_name: product.name,
        content_ids: [event.productId],
        content_type: 'product',
      },
    },
  };
}

/**
 * Digits only, with Brazil's 55 in front when the number is a bare DDD +
 * number (10 or 11 digits). Anything shorter is not a phone, and hashing it
 * would only add noise to the match.
 */
export function normalizePhone(raw: string | undefined): string | undefined {
  const digits = raw?.replace(/\D/g, '') ?? '';
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12) return digits;
  return undefined;
}

/**
 * Kiwify writes `approved_date` as `2026-09-24 10:30`, with no zone, in
 * Brasília time. A value Meta would refuse (future, older than seven days) or
 * cannot read falls back to now, so a bad date never costs the conversion.
 */
export function readEventTime(raw: string | undefined, now: Date): number {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const value = raw?.trim();
  if (!value) return nowSeconds;

  const local = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/.exec(value);
  const ms = local ? Date.parse(`${local[1]}T${local[2]}${local[3] ?? ':00'}-03:00`) : Date.parse(value);
  if (Number.isNaN(ms)) return nowSeconds;

  const seconds = Math.floor(ms / 1000);
  if (seconds > nowSeconds || seconds < nowSeconds - MAX_AGE_SECONDS) return nowSeconds;
  return seconds;
}

/** What goes into `billing_events.result`: the outcome, never the data. */
export function capiResult(decision: PurchaseDecision, sent?: SendResult): string {
  if (decision.kind === 'skip') return `capi:skipped:${decision.reason}`;
  if (sent?.ok) return 'capi:sent';
  return `capi:failed:${sent?.code ?? 'unknown'}`;
}

function readNames(firstName: string | undefined, fullName: string | undefined) {
  const clean = (value: string | undefined) => value?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
  const parts = clean(fullName).split(' ').filter(Boolean);
  const first = clean(firstName) || parts[0] || '';
  const last = parts.slice(1).join(' ');
  return { first, last };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function pick(source: unknown, ...path: string[]): unknown {
  let cursor = source;
  for (const key of path) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor;
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return String(value);
  return undefined;
}
