'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; message: string };

/**
 * Tirar um artigo do ar e pôr de volta.
 *
 * Mexe só em `hidden_at`, nunca em `published_at`: a data que o leitor vê
 * sobrevive a esconder e republicar, e o cron, que faz upsert sem essa
 * coluna, não consegue desfazer o que o Kauã decidiu aqui.
 *
 * Cada ação confere o admin por conta própria (Server Action é um POST que
 * qualquer um chama), e escreve com o cliente do usuário: a política
 * `articles_admin_write` é o portão de verdade.
 */
async function setHidden(formData: FormData, hidden: boolean): Promise<ActionState> {
  await requireAdmin();
  const supabase = await serverClient();

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, message: 'Sem id.' };

  const { data, error } = await supabase
    .from('articles')
    .update({ hidden_at: hidden ? new Date().toISOString() : null })
    .eq('id', id)
    .select('slug')
    .maybeSingle();

  if (error || !data) return { ok: false, message: 'Não consegui mudar.' };

  revalidatePath('/admin/artigos');
  revalidatePath('/circle/artigos');
  revalidatePath(`/circle/artigos/${data.slug}`);
  return { ok: true, message: hidden ? 'Fora do ar.' : 'No ar.' };
}

export async function hideArticle(_previous: ActionState, formData: FormData) {
  return setHidden(formData, true);
}

export async function showArticle(_previous: ActionState, formData: FormData) {
  return setHidden(formData, false);
}
