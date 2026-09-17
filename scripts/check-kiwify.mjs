/**
 * Acceptance check for the Kiwify webhook, against a real server and a real
 * Postgres, with synthetic but correctly signed events.
 *
 * A real R$1 purchase is still the last word — only Kiwify can tell us the
 * true payload shape and signature algorithm. Everything downstream of that
 * is ours, and this proves it: the refusal of a forged event, the idempotency
 * that stops a redelivery from buying a free month, and the cancellation rule
 * Kauã chose.
 *
 * The server must run with:
 *   KIWIFY_WEBHOOK_TOKEN=<secret>
 *   KIWIFY_PRODUCTS='{"prod-circle":"circle"}'
 */
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const APP = process.env.APP_URL ?? 'http://127.0.0.1:3001';
const SUPA = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE = process.env.SERVICE_ROLE_KEY;
const SECRET = process.env.KIWIFY_WEBHOOK_TOKEN;

if (!SERVICE || !SECRET) {
  console.error('Faltam SERVICE_ROLE_KEY e KIWIFY_WEBHOOK_TOKEN no ambiente.');
  process.exit(2);
}

const admin = createClient(SUPA, SERVICE, { auth: { persistSession: false } });
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const stamp = Date.now();
const email = `kiwify.check.${stamp}@teste.local`;
const subscription = `sub-${stamp}`;

const iso = (days) => new Date(Date.now() + days * 86400000).toISOString();

function body(type, over = {}) {
  return {
    order_id: `evt-${type}-${stamp}-${over.nonce ?? 0}`,
    webhook_event_type: type,
    Customer: { email, full_name: 'Pessoa De Teste' },
    Product: { product_id: 'prod-circle' },
    Subscription: { id: subscription, next_payment: over.periodEnd ?? iso(30) },
    ...over.extra,
  };
}

async function post(payload, { signature } = {}) {
  const raw = JSON.stringify(payload);
  const sig = signature ?? createHmac('sha1', SECRET).update(raw).digest('hex');
  return fetch(`${APP}/api/webhooks/kiwify?signature=${sig}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw,
  });
}

const rowFor = async () => {
  const { data } = await admin
    .from('entitlements')
    .select('id, status, expires_at, source, external_id')
    .eq('email_norm', email);
  return data ?? [];
};

// 1. An unsigned or wrongly signed event is the whole threat model.
const unsigned = await fetch(`${APP}/api/webhooks/kiwify`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body('order_approved')),
});
check('an unsigned event is refused', unsigned.status === 400, String(unsigned.status));

const forged = await post(body('order_approved'), { signature: 'f'.repeat(40) });
check('a forged signature is refused', forged.status === 400, String(forged.status));

check('and neither of them granted anything', (await rowFor()).length === 0);

// 2. A product that is not ours is ignored, not guessed at.
// Its own nonce: sharing an order_id with the real purchase below would make
// that purchase look like a redelivery, and the idempotency lock would --
// correctly -- skip it.
const foreign = await post({
  ...body('order_approved', { nonce: 9 }),
  Product: { product_id: 'curso-de-outra-pessoa' },
});
check('an unmapped product is accepted and ignored', foreign.status === 200, String(foreign.status));
check('it granted nothing', (await rowFor()).length === 0);

// 3. The purchase.
const approved = body('order_approved', { periodEnd: iso(30) });
const first = await post(approved);
check('an approved order is accepted', first.status === 200, String(first.status));

let rows = await rowFor();
check('it granted exactly one row', rows.length === 1, String(rows.length));
check('the row is a live Circle from kiwify', rows[0]?.status === 'active' && rows[0]?.source === 'kiwify');
const firstExpiry = rows[0]?.expires_at;

// 4. The redelivery. This is the one that costs money when it is wrong.
const again = await post(approved);
check('a redelivered event is accepted', again.status === 200, String(again.status));
rows = await rowFor();
check('the redelivery did not add a second row', rows.length === 1, String(rows.length));
check('and did not push the date out', rows[0]?.expires_at === firstExpiry);

// 5. A renewal moves the date on the row that exists.
const renewed = await post(body('subscription_renewed', { nonce: 1, periodEnd: iso(60) }));
check('a renewal is accepted', renewed.status === 200);
rows = await rowFor();
check('the renewal kept one row', rows.length === 1, String(rows.length));
check(
  'and moved the date out',
  new Date(rows[0]?.expires_at) > new Date(firstExpiry),
  `${firstExpiry} -> ${rows[0]?.expires_at}`,
);
const renewedExpiry = rows[0]?.expires_at;

/**
 * 6. Kauã's rule: cancelling keeps what was already paid for. The trap is that
 *    writing status 'canceled' would cut the person off today, because
 *    active_products() only accepts 'active' and 'past_due'.
 */
const canceled = await post(body('subscription_canceled', { nonce: 2, periodEnd: renewedExpiry }));
check('a cancellation is accepted', canceled.status === 200);
rows = await rowFor();
check(
  'a cancelled subscription stays live until the paid period ends',
  rows[0]?.status === 'active' && rows[0]?.expires_at === renewedExpiry,
  `${rows[0]?.status} até ${rows[0]?.expires_at}`,
);

// 7. A refund is the opposite: the money went back, so the access goes now.
const refunded = await post(body('order_refunded', { nonce: 3 }));
check('a refund is accepted', refunded.status === 200);
rows = await rowFor();
check('a refund revokes at once', rows[0]?.status === 'revoked', String(rows[0]?.status));

// 8. Every delivery left a record, which is what makes a dispute answerable.
const { data: events } = await admin
  .from('billing_events')
  .select('event_type, processed_at, result')
  .like('external_event_id', `evt-%-${stamp}-%`);
check(
  'every accepted event was recorded and processed',
  (events ?? []).length >= 4 && (events ?? []).every((e) => e.processed_at),
  `${(events ?? []).length} eventos`,
);

await admin.from('entitlements').delete().eq('email_norm', email);
await admin.from('billing_events').delete().like('external_event_id', `evt-%-${stamp}-%`);

let failed = 0;
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
