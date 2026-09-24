import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { displayFirstName, hasPlaceholder, isOptOutReply, isQuietHour, t0Variant } from '@/lib/core/evento.core';
import { renderWaText, waAddressVariants, waClaimableSteps, waPhoneDigits, waReason } from '@/lib/core/evento-wa.core';
import { IMERSAO_GRUPO_WHATSAPP_URL } from '@/lib/imersao';
import { eventoConfig, surveyUrl, waConfig } from './config';

/**
 * O lado do site no WhatsApp individual: o que `/api/wa/claim`,
 * `/api/wa/result` e `/api/wa/optout` fazem, sem o HTTP.
 *
 * O worker do ww-evolution-01 é burro de propósito (ver
 * `ops/ww-wa-worker/README.md`): quem decide quem recebe o quê é daqui para
 * dentro. As regras de fila que não podem ter corrida (lease, intervalo,
 * teto, ordem, pago, SAIR) são do `claim_wa_jobs`; as que dependem de
 * configuração (silêncio, links, kill switch, live) são calculadas aqui e
 * chegam ao banco como parâmetro.
 *
 * Nunca registra telefone, nome ou texto: log leva id de job e contagens.
 */

export type WaMode = 'dry-run' | 'allowlist' | 'live';
export type ClaimInput = { limit: number; mode: WaMode; dryRun: boolean; quiet: boolean };
export type WaJob = { id: string; phone: string; text: string; step_key: string };

type ClaimRow = {
  job_id: string;
  buyer_id: string;
  step_key: string;
  phone_e164: string;
  first_name: string | null;
  purchased_at: string;
  source: string;
};

const MAX_LIMIT = 10;

export const claimBodySchema = z.object({
  limit: z.number().int().min(1).max(1000).default(1),
  mode: z.enum(['dry-run', 'allowlist', 'live']),
  dry_run: z.boolean().default(true),
  quiet: z.boolean().default(false),
});

export async function claimWaJobs(admin: SupabaseClient, input: ClaimInput, now: Date = new Date()): Promise<{ jobs: WaJob[] }> {
  const wa = waConfig();
  if (!wa.enabled) return { jobs: [] };

  const evento = eventoConfig();
  const dryRun = input.dryRun || input.mode === 'dry-run';
  const steps = waClaimableSteps({
    quiet: input.quiet || isQuietHour(now),
    hasSurveyLink: Boolean(evento.linkSecret),
    hasVideosUrl: Boolean(wa.videosUrl),
    now,
  });

  const { data, error } = await admin.rpc('claim_wa_jobs', {
    p_limit: Math.min(Math.max(1, input.limit), MAX_LIMIT),
    p_now: now.toISOString(),
    p_steps: steps,
    // Três travas independentes (design, seção 6): o worker em live, o site
    // em live e, fora disso, só comprador do produto de teste.
    p_real_buyers: input.mode === 'live' && evento.mode?.trim().toLowerCase() === 'live',
    p_antigos: wa.antigosReleased,
    p_daily_cap: wa.dailyCap,
    p_dry_run: dryRun,
  });
  if (error) throw new Error(`claim_wa_jobs: ${error.code ?? 'erro'}`);

  const jobs: WaJob[] = [];
  let blocked = 0;
  for (const row of (data ?? []) as ClaimRow[]) {
    const ctx = {
      variant: t0Variant(new Date(row.purchased_at)),
      surveyUrl: evento.linkSecret
        ? surveyUrl(row.buyer_id, evento.linkSecret, row.step_key === 't0_antigos' ? 'antigos' : undefined)
        : undefined,
      groupUrl: IMERSAO_GRUPO_WHATSAPP_URL,
      videosUrl: wa.videosUrl,
    };
    // A guarda olha o modelo com um nome neutro: o nome é digitado por quem
    // comprou, e `[Ana]` pareceria marcador e travaria o job para sempre.
    const template = renderWaText(row.step_key, { ...ctx, firstName: 'Nome' });
    const text = renderWaText(row.step_key, { ...ctx, firstName: displayFirstName(row.first_name) });
    if (!template || !text || hasPlaceholder(template)) {
      blocked += 1;
      if (!dryRun) {
        await admin
          .from('message_jobs')
          .update({ status: 'blocked', error: template ? 'placeholder' : 'sem-texto', lease_until: null })
          .eq('id', row.job_id)
          .eq('status', 'claimed');
      }
      continue;
    }
    jobs.push({ id: row.job_id, phone: waPhoneDigits(row.phone_e164), text, step_key: row.step_key });
  }

  console.info('[wa/claim]', { n: jobs.length, blocked, dryRun, ids: jobs.map((job) => job.id) });
  return { jobs };
}

// ------------------------------------------------------------------ resultado

export type WaResult = {
  id: string;
  status: 'sent' | 'failed' | 'no_whatsapp' | 'skipped';
  reason?: string;
  wa_jid?: string;
  message_id?: string;
};

// Formato de uuid, sem exigir a versão: quem confere se o job existe é o banco.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const resultSchema = z.object({
  id: z.string().regex(UUID),
  status: z.enum(['sent', 'failed', 'no_whatsapp', 'skipped']),
  reason: z.string().max(200).optional().catch(undefined),
  wa_jid: z.string().max(64).optional().catch(undefined),
  message_id: z.string().max(200).optional().catch(undefined),
});

/**
 * O relato do worker, com cada campo opcional passado por um formato fechado:
 * o que não tem cara de motivo, JID ou id de mensagem cai fora em vez de ir
 * para o banco.
 */
export function parseWaResult(body: unknown): { ok: true; value: WaResult } | { ok: false } {
  const parsed = resultSchema.safeParse(body);
  if (!parsed.success) return { ok: false };
  const { id, status } = parsed.data;
  const reason = waReason(parsed.data.reason);
  const jid = parsed.data.wa_jid && /^\d{8,15}@s\.whatsapp\.net$/.test(parsed.data.wa_jid) ? parsed.data.wa_jid : undefined;
  const messageId =
    parsed.data.message_id && /^[A-Za-z0-9_-]{1,128}$/.test(parsed.data.message_id) ? parsed.data.message_id : undefined;
  return {
    ok: true,
    value: {
      id,
      status,
      ...(reason ? { reason } : {}),
      ...(jid ? { wa_jid: jid } : {}),
      ...(messageId ? { message_id: messageId } : {}),
    },
  };
}

export async function recordWaResult(
  admin: SupabaseClient,
  result: WaResult,
  now: Date = new Date(),
): Promise<'updated' | 'noop' | 'not_found'> {
  const { data, error } = await admin.rpc('evento_wa_result', {
    p_job: result.id,
    p_status: result.status,
    p_reason: result.reason ?? null,
    p_jid: result.wa_jid ?? null,
    p_message_id: result.message_id ?? null,
    p_now: now.toISOString(),
  });
  if (error) throw new Error(`evento_wa_result: ${error.code ?? 'erro'}`);
  const outcome = data as 'updated' | 'noop' | 'not_found';
  console.info('[wa/result]', { job: result.id, status: result.status, outcome });
  return outcome;
}

// ------------------------------------------------------------------ SAIR

export const optoutBodySchema = z.object({
  phone: z.string().min(1).max(64),
  text: z.string().max(500),
});

/**
 * Uma resposta que chegou no +1. Só vira saída se for SAIR de verdade
 * (`isOptOutReply`: "vou sair mais cedo" é conversa). O número vale nas duas
 * formas, com e sem o nono dígito.
 */
export async function recordWaOptout(
  admin: SupabaseClient,
  input: { phone: string; text: string },
): Promise<{ optout: boolean; canceled: number }> {
  const addresses = waAddressVariants(input.phone);
  if (addresses.length === 0) throw new Error('telefone ilegível');
  if (!isOptOutReply(input.text)) return { optout: false, canceled: 0 };

  const { data, error } = await admin.rpc('evento_wa_optout', { p_addresses: addresses });
  if (error) throw new Error(`evento_wa_optout: ${error.code ?? 'erro'}`);
  const canceled = typeof data === 'number' ? data : 0;
  console.info('[wa/optout]', { canceled });
  return { optout: true, canceled };
}
