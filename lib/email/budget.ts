import type { SupabaseClient } from '@supabase/supabase-js';
import { budgetAllows, readDailyBudget } from '@/lib/core/email-budget.core';

/**
 * Quantos e-mails a plataforma mandou nas últimas 24h, somando tudo que fica
 * registrado: a régua do Circle (`circle_emails`) e a fila do evento
 * (`message_jobs`). Os alertas não ficam registrados; a reserva de 10 da
 * conta é o espaço deles.
 *
 * Mínimo do Marco 1: a T0 do evento consulta isto antes de enviar. A régua
 * passa a consultar também na tarefa 6 do design (hoje ela segue com o teto
 * local de 90).
 */
export async function emailsSentLast24h(admin: SupabaseClient, now: Date): Promise<number | null> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [circle, evento] = await Promise.all([
    admin.from('circle_emails').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', since),
    admin
      .from('message_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('channel', 'email')
      .eq('status', 'sent')
      .gte('sent_at', since),
  ]);
  if (circle.error || evento.error) return null;
  return (circle.count ?? 0) + (evento.count ?? 0);
}

/**
 * Pode sair mais um e-mail que não é alerta? Sem conseguir contar, não: um
 * envio adiado volta no próximo tick, uma cota estourada derruba o alerta.
 */
export async function eventoEmailAllowed(admin: SupabaseClient, now: Date): Promise<boolean> {
  const sent = await emailsSentLast24h(admin, now);
  if (sent === null) return false;
  return budgetAllows({ sentLast24h: sent, budget: readDailyBudget(process.env.RESEND_DAILY_BUDGET) });
}
