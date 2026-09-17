import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';
import { serverClient } from '@/lib/supabase/server';

/**
 * Entrega um documento de aluno, depois de o banco já ter dito que pode.
 *
 * A ordem é o desenho inteiro, igual à rota da Library: primeiro a linha é
 * lida com o cliente DO USUÁRIO, então `student_documents_read_own` decide.
 * Sem direito não há linha, e a rota termina em 404 sem ter tocado no
 * storage. Só depois o service role entra, e só para assinar um caminho que a
 * política já aprovou.
 *
 * O que esta rota tem e a da Library não: a trilha. Report semanal é dado de
 * saúde, e a pergunta que uma auditoria faz é "quem abriu o report da Mônica
 * em 14/09". Sem uma linha por leitura, inclusive a do próprio dono e
 * inclusive a de um admin, não existe resposta.
 *
 * Toda recusa é 404, nunca 403. Um 403 conta que o arquivo existe e vale a
 * pena voltar; um redirecionamento para o login conta o mesmo com mais
 * educação.
 */
const SIGNED_URL_TTL_SECONDS = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await serverClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  // A autorização. O RLS devolve a linha para o dono (por id, por e-mail do
  // JWT ou por alias) e para o admin. Para todo o resto, nada.
  const { data: document } = await supabase
    .from('student_documents')
    .select('id, storage_path, user_id, email_norm')
    .eq('id', id)
    .maybeSingle();

  if (!document?.storage_path) return notFound();

  const admin = adminClient();

  /**
   * Quem está lendo, do ponto de vista da trilha.
   *
   * A política deixa passar por três pontes, e "é meu" não é o mesmo que
   * "sou admin". A conta é feita pelo `user_id` já carimbado ou pelo e-mail
   * do próprio token — nunca por uma segunda consulta ao banco, que poderia
   * discordar da que já autorizou.
   */
  const ownsIt =
    document.user_id === user.id ||
    document.email_norm === (user.email ?? '').trim().toLowerCase();

  const { data: signed, error } = await admin.storage
    .from('students')
    .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    // Não ecoa o erro do storage: ele carrega o caminho do objeto.
    console.error('[aluno] falha ao assinar URL', { documentId: id, status: error?.name });
    return new Response('Não consegui preparar o download agora.', { status: 502 });
  }

  /**
   * A trilha é escrita ANTES do redirecionamento, e com o service role porque
   * `authenticated` só tem `select` nesta tabela: ninguém escreve a própria
   * história nem apaga a de outro.
   *
   * Se o INSERT falhar, a entrega para. É o contrário do que se faria com um
   * log comum, e é de propósito: um acesso a dado de saúde que não deixou
   * rastro é pior para o aluno do que um download que não aconteceu, porque o
   * segundo ele percebe e o primeiro ninguém percebe nunca.
   */
  const { error: trailError } = await admin.from('document_access_log').insert({
    document_id: document.id,
    actor_id: user.id,
    actor_role: ownsIt ? 'own' : 'admin',
    action: 'download',
  });

  if (trailError) {
    console.error('[aluno] trilha recusou a escrita', { documentId: id, code: trailError.code });
    return new Response('Não consegui registrar este acesso, então não vou entregar o arquivo.', {
      status: 503,
    });
  }

  redirect(signed.signedUrl);
}

function notFound() {
  return new Response('Não encontrado.', { status: 404 });
}
