'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; message: string };

/**
 * Remove one row from the interest list.
 *
 * A Server Action is a POST endpoint anybody can call with a fetch, so this
 * re-checks for itself rather than trusting that the button was only rendered
 * inside /admin. The write then goes through the *user's* client:
 * `interest_delete_admin` is the real gate, and a bug here fails closed
 * against the policy instead of around it.
 */
export async function removeInterest(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await serverClient();

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, message: 'Sem id.' };

  const { error } = await supabase.from('interest').delete().eq('id', id);
  if (error) return { ok: false, message: 'Não consegui remover.' };

  revalidatePath('/admin/interesse');
  return { ok: true, message: 'Removido.' };
}
