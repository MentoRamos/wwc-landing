'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guard';
import { adminClient } from '@/lib/supabase/admin';
import { serverClient } from '@/lib/supabase/server';
import { readUploadForm } from '@/lib/core/student.core';

export type ActionState = { ok: boolean; message: string };
export const INITIAL_STATE: ActionState = { ok: false, message: '' };

const MAX_BYTES = 50 * 1024 * 1024; // o mesmo teto que o bucket declara

/**
 * Sobe um documento de aluno.
 *
 * Server Action é um endpoint POST que qualquer um chama com um fetch, e o
 * formulário morar dentro de `/admin` não prova nada sobre quem está
 * chamando. Por isso `requireAdmin()` aqui, e por isso a linha é escrita pelo
 * cliente DO USUÁRIO: `student_documents_admin_write` é o portão de verdade, e
 * um bug meu falha fechado contra a política em vez de passar por fora dela.
 *
 * O service role entra só no storage, porque o bucket `students` não tem
 * política nenhuma para `authenticated` — de propósito, igual à Library.
 */
export async function uploadDocument(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    return await upload(formData);
  } catch (cause) {
    /**
     * O que sobra vira mensagem, não 500.
     *
     * A primeira versão deixava qualquer exceção subir, e o error boundary
     * respondia "Alguma coisa quebrou aqui" com um digest. Do lado de quem
     * opera isso é o pior desfecho possível: o documento pode ter sido escrito
     * ou não, o arquivo pode estar no bucket ou não, e a tela não diz qual dos
     * dois. Uma tela que mexe com dado de saúde precisa terminar dizendo o que
     * aconteceu, mesmo quando o que aconteceu foi inesperado.
     */
    const detalhe = cause instanceof Error ? cause.message : String(cause);
    console.error('[admin/documentos] exceção no upload', { detalhe });
    return { ok: false, message: `Falhou antes de terminar: ${detalhe}` };
  }
}

async function upload(formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Escolha o arquivo PDF.' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: 'O arquivo passa de 50 MB, que é o teto do bucket.' };
  }

  const text = (key: string) => String(formData.get(key) ?? '');
  const parsed = readUploadForm(
    {
      email: text('email'),
      kind: text('kind'),
      title: text('title'),
      period_label: text('period_label'),
      issued_at: text('issued_at'),
      filename: file.name,
    },
    new Date(),
  );

  if (!parsed.ok) return { ok: false, message: parsed.message };
  const doc = parsed.doc;

  const admin = adminClient();

  /**
   * O arquivo primeiro, a linha depois.
   *
   * A ordem inversa é tentadora e está errada. Se a linha entrasse antes e o
   * upload falhasse, o aluno veria na página dele um documento que não abre —
   * e ele não tem como saber que o problema é meu. Na ordem daqui, o que sobra
   * de uma falha é um arquivo órfão num bucket privado: invisível, inofensivo,
   * e recuperável porque a linha nunca existiu.
   */
  const { error: uploadError } = await admin.storage
    .from('students')
    .upload(doc.storage_path, file, { contentType: 'application/pdf', upsert: false });

  if (uploadError) {
    console.error('[admin/documentos] upload recusado', { status: uploadError.name });
    return { ok: false, message: 'O storage recusou o arquivo. Tente de novo.' };
  }

  const supabase = await serverClient();
  const { error: insertError } = await supabase.from('student_documents').insert({
    email_norm: doc.email_norm,
    email_raw: doc.email_raw,
    kind: doc.kind,
    title: doc.title,
    period_label: doc.period_label,
    issued_at: doc.issued_at,
    storage_path: doc.storage_path,
  });

  if (insertError) {
    // Sem a linha, o arquivo não serve para nada e nem aparece. Tirar é
    // limpeza, não correção — se falhar, o que fica é lixo invisível.
    await admin.storage.from('students').remove([doc.storage_path]);
    console.error('[admin/documentos] insert recusado', { code: insertError.code });
    return { ok: false, message: `Não consegui gravar o documento: ${insertError.message}` };
  }

  revalidatePath('/admin/documentos');
  revalidatePath('/aluno');

  return { ok: true, message: `"${doc.title}" está na área do aluno.` };
}

/**
 * Tira um documento da área do aluno.
 *
 * Existia um buraco aqui: a tela subia e não tirava. Num lugar onde o campo
 * mais importante é o e-mail do DONO, isso significa que enganar-se de pessoa
 * era irreversível pela interface — um report de saúde na área de outro aluno,
 * sem botão nenhum para desfazer. Poder subir sem poder tirar não é uma tela
 * incompleta, é uma exposição que o operador não consegue parar.
 *
 * A ordem é o inverso da do upload, e pelo mesmo motivo. Primeiro a linha, que
 * é o que o aluno enxerga: no instante em que ela some, o documento sumiu da
 * página dele e a rota de download passa a devolver 404, porque a política não
 * acha mais nada. Só depois o arquivo. Se a remoção do arquivo falhar, o que
 * sobra é um objeto órfão num bucket privado, sem linha que aponte para ele:
 * invisível e inalcançável.
 *
 * A trilha de acessos daquele documento vai junto, por `on delete cascade`.
 * Isso é deliberado e vale dizer em voz alta: apagar o documento apaga também
 * o registro de quem o leu. Se um dia a trilha precisar sobreviver ao
 * documento, ela precisa parar de referenciá-lo por chave estrangeira.
 */
export async function deleteDocument(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, message: 'Documento não informado.' };

  const supabase = await serverClient();

  // Lê o caminho ANTES de apagar: depois da linha ir embora, não há como saber
  // qual arquivo remover. E a leitura passa pela mesma política da escrita.
  const { data: doc } = await supabase
    .from('student_documents')
    .select('storage_path, title')
    .eq('id', id)
    .maybeSingle();

  if (!doc) return { ok: false, message: 'Esse documento não existe mais.' };

  const { error } = await supabase.from('student_documents').delete().eq('id', id);
  if (error) {
    console.error('[admin/documentos] delete recusado', { code: error.code });
    return { ok: false, message: `Não consegui apagar: ${error.message}` };
  }

  await adminClient().storage.from('students').remove([doc.storage_path]);

  revalidatePath('/admin/documentos');
  revalidatePath('/aluno');

  return { ok: true, message: `"${doc.title}" saiu da área do aluno.` };
}
