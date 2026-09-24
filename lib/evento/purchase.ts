import type { SupabaseClient } from '@supabase/supabase-js';
import { readApprovedAt, readContact, type KiwifyEvent } from '@/lib/core/kiwify.core';
import {
  displayFirstName,
  eventoAction,
  includesRecording,
  normalizeBrPhone,
  planJobs,
} from '@/lib/core/evento.core';
import { eventoConfig } from './config';

/**
 * O lado do evento no webhook da Kiwify: registrar quem comprou o ingresso,
 * cancelar o que ainda não saiu quando o ingresso é reembolsado, e marcar
 * quem comprou a gravação, a reserva ou o Protocol.
 *
 * Cada efeito é uma função do banco (uma transação), e a decisão de qual
 * efeito é do núcleo (`eventoAction`, testado). Aqui só tem a ponte.
 *
 * Nada do payload vai para log nem para `result`: só o desfecho e contagens.
 */
export type EventoOutcome = {
  /** Vai para `billing_events.result`, junto com o da CAPI. */
  result: string;
  /** Job da T0 por e-mail a enviar no `after()`, quando há um pendente. */
  t0JobId?: string;
  /** Linhas do alerta ao Kauã, quando algo precisa de olho humano. */
  alert?: string[];
};

export async function applyEventoEvent(
  admin: SupabaseClient,
  input: { event: KiwifyEvent; payload: unknown; now: Date },
): Promise<EventoOutcome> {
  const { event, payload, now } = input;
  const action = eventoAction(event, eventoConfig().testProductIds);

  if (action.op === 'ignore') return { result: `evento:ignorado:${action.reason}` };

  if (action.op === 'register') {
    const contact = readContact(payload);
    const purchasedAt = readApprovedAt(payload, now);
    const recording = includesRecording(purchasedAt);
    const jobs = planJobs({ purchasedAt, includesRecording: recording }).map((job) => ({
      channel: job.channel,
      step_key: job.stepKey,
      due_at: job.dueAt.toISOString(),
    }));

    const { data, error } = await admin.rpc('evento_register_buyer', {
      p_order_id: event.id,
      p_email: event.email,
      p_first_name: displayFirstName(contact.firstName ?? contact.fullName),
      p_phone: normalizeBrPhone(contact.phone),
      p_purchased_at: purchasedAt.toISOString(),
      p_includes_recording: recording,
      p_source: action.sandbox ? 'sandbox' : 'webhook',
      p_jobs: jobs,
    });
    if (error) return failed('registro', error.code, event);

    const row = (data as Array<{ buyer_id: string; created: boolean; t0_email_job_id: string | null }> | null)?.[0];
    if (!row) return failed('registro', 'sem-linha', event);
    return {
      result: row.created ? 'evento:registrado' : 'evento:ja-registrado',
      ...(row.t0_email_job_id ? { t0JobId: row.t0_email_job_id } : {}),
    };
  }

  if (action.op === 'cancel') {
    const { data, error } = await admin.rpc('evento_cancel_buyer', {
      p_order_id: event.id,
      p_email: event.email,
      p_status: action.status,
    });
    if (error) return failed('cancelamento', error.code, event);

    const row = (data as Array<{ buyer_id: string | null; canceled_jobs: number; matched_by: string }> | null)?.[0];
    const matched = row?.matched_by ?? 'sem-linha';
    const result = `evento:${action.status}:${matched}:${row?.canceled_jobs ?? 0}`;
    if (matched === 'ambiguous') {
      return {
        result,
        alert: [
          `Evento: ${event.id} (${event.type})`,
          'O reembolso veio com outro order_id e há mais de um ingresso pago com o mesmo e-mail.',
          'Nenhum comprador foi cancelado. Confira em event_buyers qual pedido foi desfeito.',
        ],
      };
    }
    return { result };
  }

  const { data, error } = await admin.rpc('evento_mark_purchase', {
    p_email: event.email,
    p_kind: action.kind,
    p_at: readApprovedAt(payload, now).toISOString(),
  });
  if (error) return failed('marcacao', error.code, event);
  return { result: `evento:${action.kind}:${typeof data === 'number' ? data : 0}` };
}

function failed(step: string, code: string | undefined, event: KiwifyEvent): EventoOutcome {
  const reason = code ?? 'erro';
  console.error('[evento] falhou', { event: event.id, step, code: reason });
  return {
    result: `evento:falhou:${step}:${reason}`,
    alert: [
      `Evento: ${event.id} (${event.type})`,
      `Etapa: ${step} (${reason})`,
      'A venda em si está certa e está em billing_events. O pós-compra da imersão não registrou esta compra.',
    ],
  };
}
