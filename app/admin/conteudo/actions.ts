'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { readContentForm } from '@/lib/core/content.core';

export type ActionState = { ok: boolean; message: string };


/**
 * Uma Server Action é um endpoint POST que qualquer um chama com um fetch. O
 * formulário só existir dentro de `/admin` não prova nada sobre quem está
 * chamando, então toda ação confere por conta própria.
 *
 * E a escrita vai pelo cliente *do usuário*, não pelo service role:
 * `content_admin_write` é o portão de verdade, e um bug aqui falha fechado
 * contra a política em vez de passar por fora dela.
 */
async function adminClientOrRefuse() {
  await requireAdmin();
  return serverClient();
}

function fields(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? '');
  return {
    title: text('title'),
    slug: text('slug'),
    collection: text('collection'),
    kind: text('kind'),
    description: text('description'),
    storage_path: text('storage_path'),
    youtube_id: text('youtube_id'),
    duration: text('duration'),
    season: text('season'),
    sort_order: text('sort_order'),
    publish: text('publish'),
    required_products: formData.getAll('required_products').map(String),
  };
}

/**
 * O `slug` é único na tabela, então um upsert por slug é o que faz esta tela
 * servir para criar e para corrigir sem duas telas. Republicar um item que já
 * existe é o caso comum: a gravação da quinta sobe, a descrição sai errada, e
 * o conserto não pode exigir SQL.
 */
export async function saveContent(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await adminClientOrRefuse();

  const parsed = readContentForm(fields(formData), new Date());
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const { error } = await supabase
    .from('content_items')
    .upsert(parsed.row, { onConflict: 'slug' });

  if (error) return { ok: false, message: `O banco recusou: ${error.message}` };

  revalidatePath('/admin/conteudo');
  revalidatePath('/biblioteca');
  return {
    ok: true,
    message: parsed.row.published_at
      ? `"${parsed.row.title}" está no ar.`
      : `"${parsed.row.title}" salvo como rascunho.`,
  };
}

/**
 * Despublicar, nunca apagar.
 *
 * `published_at = null` tira o item da prateleira e da view `content_catalog`
 * sem destruir o progresso de quem já assistiu — `progress` aponta para a
 * linha por id, e um delete levaria junto o "continue de onde parou" de todo
 * mundo, em cascata e sem aviso.
 */
export async function unpublishContent(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await adminClientOrRefuse();

  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, message: 'Sem id, não dá para despublicar nada.' };

  const { error } = await supabase
    .from('content_items')
    .update({ published_at: null })
    .eq('id', id);

  if (error) return { ok: false, message: `O banco recusou: ${error.message}` };

  revalidatePath('/admin/conteudo');
  revalidatePath('/biblioteca');
  return { ok: true, message: 'Fora da prateleira. O progresso de quem assistiu continua lá.' };
}

/** Volta para a prateleira, com a data de agora. */
export async function publishContent(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await adminClientOrRefuse();

  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, message: 'Sem id, não dá para publicar nada.' };

  const { error } = await supabase
    .from('content_items')
    .update({ published_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { ok: false, message: `O banco recusou: ${error.message}` };

  revalidatePath('/admin/conteudo');
  revalidatePath('/biblioteca');
  return { ok: true, message: 'No ar.' };
}
