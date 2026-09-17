import { adminClient } from '@/lib/supabase/admin';
import { alertAdmin } from '@/lib/alerts';
import {
  describe,
  describeMode,
  detectSignature,
  interpret,
  isActionable,
  readEvent,
} from '@/lib/core/kiwify.core';
import { productFor, signatureCandidates, webhookSecret } from '@/lib/kiwify/config';
import { recordProbe } from '@/lib/kiwify/probe';

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

  /**
   * Qual prova de origem casou, entre as formas que a Kiwify poderia ter
   * usado. A resposta não muda — assinatura que não bate é 400 — mas o que
   * acontece antes do 400 mudou: o evento recusado fica registrado e o Kauã
   * é avisado, em vez de sumir calado no dia da primeira venda.
   */
  const candidates = signatureCandidates(request);
  const matched = candidates
    .map((candidate) => ({ candidate, mode: detectSignature({ payload: raw, provided: candidate.value, secret }) }))
    .find((attempt) => attempt.mode);

  if (!matched?.mode) {
    await recordProbe(adminClient(), {
      reason: 'assinatura não reconhecida',
      raw,
      candidates,
    });
    return new Response('bad signature', { status: 400 });
  }

  // Fica no log qual forma a Kiwify usa de verdade. É a resposta que a
  // documentação não dá, e ela só aparece com um evento real na mão.
  console.info('[kiwify] evento aceito', {
    source: matched.candidate.source,
    mode: describeMode(matched.mode),
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Response('ok', { status: 200 });
  }

  const event = readEvent(parsed);
  if (!event) {
    // Assinado por quem devia, e ainda assim ilegível: é formato novo, não
    // ataque. O corpo vai para a sonda porque aqui ele é a única forma de
    // descobrir o que mudou.
    console.error('[kiwify] payload não reconhecido', { keys: describe(parsed) });
    await recordProbe(adminClient(), {
      reason: 'evento assinado mas em formato não reconhecido',
      raw,
      candidates,
    });
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
      //
      // `user_id` is spread in only when the checkout gave one back, never as
      // an explicit undefined. An upsert sets every column it is handed, so
      // naming the key on a renewal that arrived without tracking parameters
      // would wipe the link that `handle_new_user()` had already made — and
      // the person would lose the Library on the very payment that renewed it.
      const { error } = await admin.from('entitlements').upsert(
        {
          email_norm: decision.email,
          email_raw: decision.email,
          product: decision.product,
          status: decision.status,
          source: 'kiwify',
          external_id: decision.externalId,
          expires_at: decision.expiresAt.toISOString(),
          ...(decision.userId ? { user_id: decision.userId } : {}),
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

    // O pior caso da cobrança: assinatura certa, evento entendido, e o acesso
    // não entrou. Quem pagou não tem como saber, e a Kiwify não vai repetir
    // porque a resposta é 200. Sem este aviso, ninguém fica sabendo.
    await alertAdmin('Paguei e o acesso não entrou', [
      `Evento: ${event.id} (${event.type})`,
      `Resultado: ${result}`,
      'O evento está em `billing_events`. Dá para conceder o acesso à mão em /admin/acessos.',
    ]);
  }

  // O outro silêncio caro, e o mais provável dos dois: o evento chegou
  // inteiro, foi entendido, e mesmo assim não virou acesso — sem data de fim
  // de período, sem e-mail, ou com um produto que não está no mapa.
  //
  // Nada disso é erro de banco, então o catch acima não pega. A resposta é
  // 200 de propósito (reenvio não conserta lógica), a Kiwify não repete, e
  // quem pagou não tem como saber. `isActionable` é o que separa isto do
  // ruído legítimo: a Kiwify manda pix gerado e compra recusada o dia
  // inteiro, e avisar sobre esses afogaria a caixa exatamente como a sonda
  // sem limitador afogaria.
  if (decision.kind === 'ignore' && isActionable(event.type)) {
    console.error('[kiwify] evento acionável ignorado', { event: event.id, result });
    await alertAdmin('Um pagamento não virou acesso', [
      `Evento: ${event.id} (${event.type})`,
      `Motivo: ${decision.reason}`,
      'O evento está em `billing_events`. Dá para conceder o acesso à mão em /admin/acessos.',
    ]);
  }

  await admin
    .from('billing_events')
    .update({ processed_at: new Date().toISOString(), result })
    .eq('provider', 'kiwify')
    .eq('external_event_id', event.id);

  return new Response('ok', { status: 200 });
}
