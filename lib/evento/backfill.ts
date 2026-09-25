import type { SupabaseClient } from '@supabase/supabase-js';
import { readEvent } from '@/lib/core/kiwify.core';
import { eventoAction } from '@/lib/core/evento.core';
import { applyEventoEvent } from '@/lib/evento/purchase';
import { eventoConfig } from './config';

/**
 * As compras que chegaram antes da automação existir.
 *
 * Desde 24/09 o webhook da Kiwify recebe todos os produtos e guarda cada
 * evento em `billing_events`, mas só registra comprador do evento depois do
 * deploy do Marco 1. O que caiu nesse intervalo é relido daqui, em ordem de
 * chegada (uma compra e o reembolso dela saem na ordem certa), e passa pela
 * mesma ponte do webhook com `backfill: true`: agenda de comprador antigo e
 * nenhuma mensagem imediata. Quem manda é o tick, e só com
 * `EVENTO_ANTIGOS_LIBERADO=true`.
 *
 * Rodar duas vezes não duplica nada: o comprador é único por pedido e o job
 * por comprador, canal e passo. O resumo leva só contagens.
 */
export type BackfillOptions = {
  since: Date;
  now: Date;
  dryRun: boolean;
  /** E-mails cujas compras ficam de fora: as compras de teste do Kauã. */
  excludeEmails: string[];
};

export type BackfillSummary = {
  read: number;
  unreadable: number;
  ignored: number;
  excluded: number;
  sandbox: number;
  register: number;
  cancel: number;
  mark: number;
  /** Só fora do dry-run: o `result` da ponte, contado. */
  results: Record<string, number>;
};

const PAGE = 1000;

export async function runBackfill(admin: SupabaseClient, options: BackfillOptions): Promise<BackfillSummary> {
  const excluded = new Set(options.excludeEmails.map(normEmail));
  const testIds = eventoConfig().testProductIds;
  const out: BackfillSummary = {
    read: 0,
    unreadable: 0,
    ignored: 0,
    excluded: 0,
    sandbox: 0,
    register: 0,
    cancel: 0,
    mark: 0,
    results: {},
  };

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('billing_events')
      .select('event_type, payload, received_at')
      .eq('provider', 'kiwify')
      .gte('received_at', options.since.toISOString())
      .order('received_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`leitura de billing_events falhou (${error.code})`);

    const rows = (data ?? []) as Array<{ payload: unknown }>;
    for (const row of rows) {
      out.read += 1;
      const event = readEvent(row.payload);
      if (!event) {
        out.unreadable += 1;
        continue;
      }
      const action = eventoAction(event, testIds);
      if (action.op === 'ignore') {
        out.ignored += 1;
        continue;
      }
      if (excluded.has(normEmail(event.email))) {
        out.excluded += 1;
        continue;
      }
      // O produto de teste já é do webhook em sandbox; no backfill não entra.
      if (action.op === 'register' && action.sandbox) {
        out.sandbox += 1;
        continue;
      }
      out[action.op] += 1;
      if (options.dryRun) continue;

      const outcome = await applyEventoEvent(admin, {
        event,
        payload: row.payload,
        now: options.now,
        backfill: true,
      });
      out.results[outcome.result] = (out.results[outcome.result] ?? 0) + 1;
    }
    if (rows.length < PAGE) break;
  }

  return out;
}

function normEmail(value: string): string {
  return value.trim().toLowerCase();
}
