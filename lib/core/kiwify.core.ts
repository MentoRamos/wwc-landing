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
 * Qual prova de origem veio junto com o evento, ou nada.
 *
 * A Kiwify lista os eventos e menciona um `token`, mas não diz o algoritmo,
 * não diz se a assinatura viaja em header ou na query, e não diz sequer se é
 * assinatura do corpo ou o segredo repetido. A versão anterior disto escolhia
 * por variável de ambiente, o que empurrava a descoberta para o dia da
 * primeira venda: dinheiro movido, acesso não concedido, e um 400 sem pista.
 *
 * Então em vez de adivinhar, reconhecemos. Cada forma plausível é testada
 * contra o segredo, e o modo que casar é devolvido para virar log. Isso não
 * afrouxa a porta: toda forma exige o mesmo segredo, a comparação é em tempo
 * constante, e ausência nunca é permissão.
 */
export type SignatureMode =
  | { kind: 'hmac'; algorithm: SignatureAlgorithm }
  | { kind: 'shared-token' };

const ALGORITHMS: SignatureAlgorithm[] = ['sha1', 'sha256'];

/** `hmac-sha256`, `token`: cabe num log e num alerta sem explicação extra. */
export function describeMode(mode: SignatureMode): string {
  return mode.kind === 'hmac' ? `hmac-${mode.algorithm}` : 'token';
}

/**
 * Comparação em tempo constante, fechada por padrão.
 *
 * O caso do comprimento importa mais do que parece: `timingSafeEqual` estoura
 * quando os buffers têm tamanhos diferentes, e um throw aqui vira 500. A
 * Kiwify repete 500, então uma requisição malformada viraria negação de
 * serviço de graça.
 */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

export function detectSignature(input: {
  payload: string;
  provided: string | null | undefined;
  secret: string;
}): SignatureMode | null {
  const provided = input.provided?.trim();
  if (!provided || !input.secret || !input.payload) return null;

  const hex = provided.toLowerCase();
  for (const algorithm of ALGORITHMS) {
    const expected = createHmac(algorithm, input.secret)
      .update(input.payload, 'utf8')
      .digest('hex');
    if (equals(hex, expected)) return { kind: 'hmac', algorithm };
  }

  // O painel da Kiwify parece mandar o próprio token na query em vez de
  // assinar o corpo. É proteção mais fraca — quem vir a URL inteira consegue
  // forjar um evento — mas é a que o provedor oferece, e recusá-la seria
  // recusar a venda. Fica nomeada no log para a escolha ser visível.
  if (equals(provided, input.secret)) return { kind: 'shared-token' };

  return null;
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
  /** The account id we put in the checkout link, when it came back. */
  userId?: string;
};

export type Decision =
  | {
      kind: 'grant';
      email: string;
      product: Product;
      expiresAt: Date;
      externalId: string;
      status: 'active' | 'past_due';
      userId?: string;
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

/**
 * Este evento deveria ter virado efeito?
 *
 * Serve para separar dois silêncios que a rota trata igual hoje. A Kiwify
 * manda muito evento que não nos diz respeito — pix gerado, boleto emitido,
 * compra recusada — e ignorar esses é o comportamento certo, calado mesmo.
 *
 * Mas ignorar um `order_approved` é outra coisa: alguém pagou. Se ele foi
 * ignorado por falta de data, por e-mail vazio ou por produto fora do mapa, o
 * dinheiro entrou e o acesso não, a resposta foi 200, e a Kiwify não vai
 * repetir. Esse silêncio precisa virar aviso.
 *
 * A lista sai das próprias tabelas que decidem o efeito. Escrita à mão, ela
 * passaria verde no dia em que alguém acrescentasse um evento a GRANTS e
 * esquecesse daqui — que é exatamente o dia em que o aviso faria falta.
 */
export function isActionable(type: string): boolean {
  return GRANTS.has(type) || REVOKES.has(type);
}

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

  return {
    kind: 'grant',
    email,
    product,
    expiresAt,
    externalId: event.subscriptionId,
    status,
    userId: event.userId,
  };
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

  const userId = accountId(
    str(pick(payload, 'TrackingParameters', 'sck')) ??
      str(pick(payload, 'tracking_parameters', 'sck')) ??
      str(pick(payload, 'sck')),
  );

  if (!id || !type) return null;
  return { id, type, email, productId, subscriptionId, periodEnd, userId };
}

/**
 * `sck` rides on a public URL, so its contents are whatever the buyer's
 * browser happened to carry: our account id, an affiliate's tag, a leftover
 * campaign string, or nothing.
 *
 * It is written into a uuid column, so anything that is not a uuid is thrown
 * away here rather than becoming a failed insert that costs somebody the
 * access they just paid for. Falling back to matching by e-mail is the
 * behaviour we already had, and it is the right floor.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function accountId(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  return value && UUID.test(value) ? value.toLowerCase() : undefined;
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
