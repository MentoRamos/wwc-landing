'use server';

import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';
import { serverClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/guard';
import type { ActionState } from '@/lib/admin/action-state';

/**
 * Apagar a própria conta.
 *
 * A decisão de quem pode apagar o quê não está aqui: está em
 * `delete_own_account()`, que só sabe apagar o dono da sessão que a chamou.
 * Esta função existe para as duas coisas que o banco não alcança — os PDFs no
 * storage e a identidade no provedor — e para a ordem entre elas.
 *
 * A ordem importa: os caminhos dos arquivos vivem nas linhas que estão prestes
 * a sumir. Ler depois é ler nada, e o PDF de um report de saúde ficaria no
 * bucket para sempre, órfão e sem ninguém sabendo que está lá.
 *
 * ⚠️ Nada aqui pode virar `export const`: um módulo `'use server'` só exporta
 * função async, e uma constante exportada derruba o módulo inteiro com E352
 * antes de qualquer código rodar.
 */
export async function deleteAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (formData.get('confirmacao') !== 'APAGAR') {
    return { ok: false, message: 'Escreva APAGAR para confirmar.' };
  }

  const user = await requireUser();
  const supabase = await serverClient();

  // Com o cliente do usuário: se a política não deixar ver, não há o que
  // apagar, e o storage não recebe um caminho que não é dele.
  const { data: docs } = await supabase.from('student_documents').select('storage_path');
  const paths = (docs ?? []).map((d) => d.storage_path as string).filter(Boolean);

  if (paths.length > 0) {
    const { error } = await adminClient().storage.from('students').remove(paths);
    if (error) {
      // Parar aqui é o certo: apagar as linhas agora deixaria os PDFs órfãos
      // no bucket, que é o oposto do que a pessoa pediu.
      return {
        ok: false,
        message: 'Não consegui apagar os seus arquivos. Nada foi apagado; tente de novo.',
      };
    }
  }

  const { error } = await supabase.rpc('delete_own_account');
  if (error) {
    console.error('[conta] exclusão recusada', { code: error.code });
    return {
      ok: false,
      message:
        error.code === '42501'
          ? 'Esta conta administra a plataforma e não pode ser apagada por aqui.'
          : 'Não consegui apagar a conta agora. Tente de novo em instantes.',
    };
  }

  console.info('[conta] conta apagada a pedido do titular', { user: user.id });

  // A conta não existe mais; o cookie ainda sim. Sem isto a próxima página
  // tenta renovar uma sessão de um usuário que sumiu.
  await supabase.auth.signOut();
  redirect('/?conta=apagada');
}
