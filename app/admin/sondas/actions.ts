'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/admin/action-state';

/**
 * Descarta uma sonda.
 *
 * Não é arrumação: é a dívida de privacidade sendo quitada. O corpo guardado
 * tem nome, e-mail e documento de quem comprou, e ele só existe para explicar
 * uma assinatura que não foi reconhecida. Entendida a assinatura, o dado não
 * tem mais razão de ficar.
 *
 * A escrita vai pelo cliente do USUÁRIO, não por service role: a política
 * `webhook_probes_discard_admin` é o portão de verdade, e um defeito aqui
 * falha contra ela em vez de passar por fora.
 */
export async function discardProbe(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await serverClient();

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, message: 'Sem id.' };

  const { error } = await supabase.from('webhook_probes').delete().eq('id', id);
  if (error) return { ok: false, message: 'Não consegui descartar.' };

  revalidatePath('/admin/sondas');
  return { ok: true, message: 'Descartada.' };
}
