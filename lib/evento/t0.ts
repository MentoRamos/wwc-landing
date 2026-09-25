import type { SupabaseClient } from '@supabase/supabase-js';
import { hasPlaceholder, resolveRecipient, displayFirstName, t0Variant } from '@/lib/core/evento.core';
import { renderT0Email } from '@/lib/core/evento-emails.core';
import { IMERSAO_GRUPO_WHATSAPP_URL } from '@/lib/imersao';
import { emailConfigured, sendEmail } from '@/lib/email/send';
import { eventoEmailAllowed } from '@/lib/email/budget';
import { eventoConfig, surveyUrl, waConfig } from './config';

/**
 * A confirmação por e-mail, enviada no `after()` do webhook.
 *
 * A ordem é a da régua do Circle, com uma diferença que o design pediu:
 *
 *   1. RESERVA o job (`pending` para `claimed`, condicionado a ainda estar
 *      `pending`) com `lease_until = now + 10 min`. Se não voltar linha,
 *      outro envio já pegou e este desiste. Se a função morrer no meio (o
 *      `after()` estoura o tempo), o job fica `claimed` com lease vencido; o
 *      tick de e-mail do Marco 3 devolve esses para `pending` e tenta de
 *      novo, e o `Idempotency-Key = evento-<jobId>` garante que um envio que
 *      chegou a sair não vira segundo e-mail. (No WhatsApp, lease vencido
 *      vira `unknown`, não `pending`: lá não há chave de idempotência.)
 *   2. Confere o que pode ter mudado: comprador ainda pago, cota do Resend,
 *      modo (live/sandbox), segredo do link, marcador sobrando.
 *   3. Envia com `Idempotency-Key = job.id`, então uma nova tentativa do
 *      mesmo job não vira dois e-mails.
 *   4. Marca `sent`. Se algo impediu o envio, o job VOLTA para `pending` com
 *      o motivo: o tick de e-mail (Marco 3) pega depois. Só vira `blocked`
 *      o que não se resolve esperando (texto com marcador) e `canceled` o
 *      que não deve mais sair (reembolso).
 *
 * Nunca registra endereço, nome ou corpo: log e coluna `error` levam só o
 * id do job e o motivo.
 */
export type T0Result = 'sent' | 'deferred' | 'canceled' | 'blocked' | 'skipped';

const LEASE_MS = 10 * 60 * 1000;

export async function sendT0Email(admin: SupabaseClient, jobId: string, now: Date = new Date()): Promise<T0Result> {
  const { data: job, error: claimError } = await admin
    .from('message_jobs')
    .update({
      status: 'claimed',
      claimed_at: now.toISOString(),
      lease_until: new Date(now.getTime() + LEASE_MS).toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'pending')
    .eq('channel', 'email')
    .eq('step_key', 't0')
    .select('id, buyer_id, attempts')
    .maybeSingle();

  if (claimError || !job) {
    if (claimError) console.error('[evento/t0] reserva falhou', { job: jobId, code: claimError.code });
    return 'skipped';
  }

  const attempts = (job.attempts as number) + 1;
  const finish = async (fields: Record<string, unknown>, result: T0Result, reason?: string) => {
    await admin.from('message_jobs').update({ attempts, lease_until: null, ...fields }).eq('id', jobId);
    console.info('[evento/t0]', { job: jobId, result, ...(reason ? { reason } : {}) });
    return result;
  };
  const defer = (reason: string) => finish({ status: 'pending', error: reason }, 'deferred', reason);

  const { data: buyer, error: buyerError } = await admin
    .from('event_buyers')
    .select('id, email_norm, first_name, status, purchased_at, source')
    .eq('id', job.buyer_id as string)
    .maybeSingle();
  if (buyerError || !buyer) return defer('comprador-ilegivel');
  if (buyer.status !== 'paid') return finish({ status: 'canceled', error: buyer.status }, 'canceled', buyer.status);

  // Comprador do backfill só recebe com o OK do Kauã: é mensagem para quem
  // comprou antes de existir a automação, e ninguém avisou que ela viria.
  const backfill = buyer.source === 'backfill';
  if (backfill && !waConfig().antigosReleased) return defer('antigos-nao-liberado');

  const config = eventoConfig();
  const recipient = resolveRecipient({
    mode: config.mode,
    allowlist: config.sandboxAllowlist,
    email: buyer.email_norm as string,
    sandboxBuyer: buyer.source === 'sandbox',
  });
  if (!recipient) return defer('modo-sandbox');
  if (!config.linkSecret) return defer('sem-link-secret');
  if (!emailConfigured()) return defer('resend-nao-configurado');
  if (!(await eventoEmailAllowed(admin, now))) return defer('cota-resend');

  const input = {
    surveyUrl: surveyUrl(buyer.id as string, config.linkSecret, backfill ? 'antigos' : undefined),
    groupUrl: IMERSAO_GRUPO_WHATSAPP_URL,
    variant: t0Variant(new Date(buyer.purchased_at as string)),
  };
  // A guarda olha o modelo com um nome neutro, antes do nome de verdade: o
  // nome é digitado por quem comprou, e `[Ana]` pareceria marcador e
  // travaria a T0 dessa pessoa para sempre. O nome sai escapado no HTML.
  const template = renderT0Email({ ...input, firstName: 'Nome' });
  if (hasPlaceholder(template.subject) || hasPlaceholder(template.html.replace(/<[^>]+>/g, ' '))) {
    return finish({ status: 'blocked', error: 'placeholder' }, 'blocked', 'placeholder');
  }
  const rendered = renderT0Email({ ...input, firstName: displayFirstName(buyer.first_name as string | null) });

  const sent = await sendEmail(recipient, rendered.subject, rendered.html, { idempotencyKey: `evento-${jobId}` });
  if (sent.ok) return finish({ status: 'sent', sent_at: new Date().toISOString(), error: null }, 'sent');
  return defer(`resend:${scrub(sent.error)}`);
}

/** A mensagem de erro do provedor pode citar o endereço. Não fica. */
function scrub(message: string): string {
  return message.replace(/[^\s@]+@[^\s@]+/g, '<email>').slice(0, 200);
}
