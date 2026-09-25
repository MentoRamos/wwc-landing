import type { SupabaseClient } from '@supabase/supabase-js';
import { emailConfigured } from '@/lib/email/send';
import { eventoEmailAllowed } from '@/lib/email/budget';
import { sendT0Email, type T0Result } from '@/lib/evento/t0';
import { waConfig } from './config';

/**
 * Um tick da fila de e-mail do evento.
 *
 * O envio de cada job (reserva, checagens, Idempotency-Key) é do sender do
 * passo; o tick só decide o que volta para a fila, o que é escolhido e quando
 * parar:
 *
 *   1. Devolve para `pending` o e-mail `claimed` com lease vencido. No e-mail
 *      isso é seguro: o `Idempotency-Key = evento-<jobId>` impede o segundo
 *      envio se o primeiro chegou a sair. (No WhatsApp é o contrário, e quem
 *      cuida é o claim de lá.)
 *   2. Marca com `sem-template` o passo vencido que ainda não tem modelo, para
 *      o painel mostrar por que ele não saiu. Continua `pending`: quando o
 *      modelo entrar, o próximo tick manda.
 *   3. Escolhe os vencidos de quem está pago. Fora de `live`, só o comprador
 *      de teste; comprador do backfill só com `EVENTO_ANTIGOS_LIBERADO`.
 *   4. Envia um por um, conferindo a cota compartilhada antes de cada envio.
 *      Acabou a cota, para: o resto fica `pending` para o próximo tick.
 */
type Sender = (admin: SupabaseClient, jobId: string, now: Date) => Promise<T0Result | string>;

export const EMAIL_TEMPLATES: Record<string, Sender> = {
  t0: sendT0Email,
};

const PICK_LIMIT = 50;

export type EmailTickResult = {
  released: number;
  candidates: number;
  sent: number;
  deferred: number;
  canceled: number;
  blocked: number;
  skipped: number;
  failed: number;
  /** Candidatos que ficaram para o próximo tick porque a cota acabou. */
  quota: number;
  skipped_reason?: string;
};

export async function runEmailTick(admin: SupabaseClient, now: Date = new Date()): Promise<EmailTickResult> {
  const nowIso = now.toISOString();
  const steps = Object.keys(EMAIL_TEMPLATES);
  const out: EmailTickResult = {
    released: 0,
    candidates: 0,
    sent: 0,
    deferred: 0,
    canceled: 0,
    blocked: 0,
    skipped: 0,
    failed: 0,
    quota: 0,
  };

  const { data: released, error: releaseError } = await admin
    .from('message_jobs')
    .update({ status: 'pending', lease_until: null, error: 'lease-vencido' })
    .eq('channel', 'email')
    .eq('status', 'claimed')
    .or(`lease_until.is.null,lease_until.lt.${nowIso}`)
    .select('id');
  if (releaseError) console.error('[evento/tick] devolução falhou', { code: releaseError.code });
  out.released = released?.length ?? 0;

  const { error: markError } = await admin
    .from('message_jobs')
    .update({ error: 'sem-template' })
    .eq('channel', 'email')
    .eq('status', 'pending')
    .not('step_key', 'in', `(${steps.join(',')})`)
    .lte('due_at', nowIso);
  if (markError) console.error('[evento/tick] marcação sem modelo falhou', { code: markError.code });

  if (!emailConfigured()) {
    // O sender adiaria cada um com o mesmo motivo; escolher e reservar seria
    // trabalho à toa a cada 5 minutos.
    out.skipped_reason = 'resend-nao-configurado';
    console.info('[evento/tick]', out);
    return out;
  }

  const live = process.env.EVENTO_MODE?.trim().toLowerCase() === 'live';
  let pick = admin
    .from('message_jobs')
    .select('id, step_key, event_buyers!inner(status, source)')
    .eq('channel', 'email')
    .eq('status', 'pending')
    .in('step_key', steps)
    .lte('due_at', nowIso)
    .eq('event_buyers.status', 'paid');
  if (!live) pick = pick.eq('event_buyers.source', 'sandbox');
  else if (!waConfig().antigosReleased) pick = pick.neq('event_buyers.source', 'backfill');

  const { data: candidates, error: pickError } = await pick.order('due_at', { ascending: true }).limit(PICK_LIMIT);
  if (pickError) {
    console.error('[evento/tick] seleção falhou', { code: pickError.code });
    out.skipped_reason = 'selecao-falhou';
    return out;
  }

  const jobs = (candidates ?? []) as Array<{ id: string; step_key: string }>;
  out.candidates = jobs.length;

  for (const [index, job] of jobs.entries()) {
    if (!(await eventoEmailAllowed(admin, now))) {
      out.quota = jobs.length - index;
      break;
    }
    const send = EMAIL_TEMPLATES[job.step_key];
    const result = await send(admin, job.id, now);
    if (
      result === 'sent' ||
      result === 'deferred' ||
      result === 'canceled' ||
      result === 'blocked' ||
      result === 'skipped' ||
      result === 'failed'
    ) {
      out[result] += 1;
    }
  }

  console.info('[evento/tick]', out);
  return out;
}
