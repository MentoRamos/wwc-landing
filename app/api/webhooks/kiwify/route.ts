import { adminClient } from '@/lib/supabase/admin';
import { describe, interpret, readEvent, verifySignature } from '@/lib/core/kiwify.core';
import {
  productFor,
  readSignature,
  signatureAlgorithm,
  webhookSecret,
} from '@/lib/kiwify/config';

/**
 * Where a purchase becomes access.
 *
 * Three rules shape this file.
 *
 * **Idempotency comes before any effect.** `billing_events` has a unique key on
 * (provider, external_event_id); the insert is the lock. A redelivered
 * `subscription_renewed` that got as far as the grant would push `expires_at`
 * out a second time and hand someone a free month, so the write that claims
 * the event happens first and a duplicate returns 200 having done nothing.
 *
 * **400 only for a bad signature.** Every other outcome is 200, including an
 * event we decided to ignore. Kiwify retries non-2xx, and a redelivery cannot
 * fix a bug in our own logic — it just produces a retry storm while the money
 * has already moved.
 *
 * **Nothing from the payload reaches a log.** It carries a buyer's name, email
 * and document number. What gets logged is the event id and the key names.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  const secret = webhookSecret();
  if (!secret) {
    console.error('[kiwify] KIWIFY_WEBHOOK_TOKEN não configurado; recusando tudo');
    return new Response('unconfigured', { status: 503 });
  }

  const ok = verifySignature({
    payload: raw,
    provided: readSignature(request),
    secret,
    algorithm: signatureAlgorithm(),
  });
  if (!ok) return new Response('bad signature', { status: 400 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Response('ok', { status: 200 });
  }

  const event = readEvent(parsed);
  if (!event) {
    // The shape we could not read, named by its keys only. This is the
    // breadcrumb that turns the first real event into a fix.
    console.error('[kiwify] payload não reconhecido', { keys: describe(parsed) });
    return new Response('ok', { status: 200 });
  }

  const admin = adminClient();

  // The lock. A duplicate delivery loses the race here and stops.
  const { error: claimError } = await admin.from('billing_events').insert({
    provider: 'kiwify',
    external_event_id: event.id,
    event_type: event.type,
    payload: parsed as Record<string, unknown>,
  });

  if (claimError) {
    // 23505 is the unique violation, i.e. we have seen this event already.
    if (claimError.code === '23505') return new Response('ok', { status: 200 });
    console.error('[kiwify] não consegui registrar o evento', { code: claimError.code });
    return new Response('ok', { status: 200 });
  }

  const decision = interpret({ event, productFor, now: new Date() });
  let result = decision.kind === 'ignore' ? decision.reason : decision.kind;

  try {
    if (decision.kind === 'grant') {
      // One row per subscription, not one per payment: the renewal moves the
      // date on the row that already exists.
      const { error } = await admin.from('entitlements').upsert(
        {
          email_norm: decision.email,
          email_raw: decision.email,
          product: decision.product,
          status: decision.status,
          source: 'kiwify',
          external_id: decision.externalId,
          expires_at: decision.expiresAt.toISOString(),
        },
        { onConflict: 'external_id,product' },
      );
      if (error) throw error;
    }

    if (decision.kind === 'revoke') {
      const { error } = await admin
        .from('entitlements')
        .update({ status: 'revoked' })
        .eq('external_id', decision.externalId)
        .eq('product', decision.product);
      if (error) throw error;
    }
  } catch (error) {
    result = `falhou: ${(error as { code?: string }).code ?? 'erro'}`;
    console.error('[kiwify] falha ao aplicar', { event: event.id, result });
  }

  await admin
    .from('billing_events')
    .update({ processed_at: new Date().toISOString(), result })
    .eq('provider', 'kiwify')
    .eq('external_event_id', event.id);

  return new Response('ok', { status: 200 });
}
