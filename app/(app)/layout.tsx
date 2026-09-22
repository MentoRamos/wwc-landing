import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppTabBar } from '@/components/layout/AppTabBar';
import { requireUser } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';

/**
 * Everything under here needs somebody signed in.
 *
 * The guard answers "is anyone there", and only that. Whether that person may
 * see a given replay or report is decided by the query that fetches it, where
 * RLS returns nothing at all if they may not — so a page added to this group
 * later cannot forget a check that does not live here.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  /**
   * Pergunta barata, e a política responde por ela: `head: true` não traz
   * linha nenhuma, só a contagem, e `student_documents_read_own` já limita a
   * contagem ao que é desta pessoa. Serve para decidir se a navegação mostra
   * `/aluno`, e não para mostrar nada.
   */
  const supabase = await serverClient();
  const { count } = await supabase
    .from('student_documents')
    .select('id', { count: 'exact', head: true });

  const hasDocuments = (count ?? 0) > 0;

  return (
    /*
     * A moldura deixou de ser uma faixa no topo e virou duas colunas.
     *
     * O cabeçalho antigo carregava marca, navegação, e-mail e sair na mesma
     * linha de 64px, e por isso cada um deles tinha que caber em pouco: a
     * navegação virou quatro rótulos de 11px e o e-mail sumia abaixo de
     * 1024px. Na coluna, cada um desses tem a largura inteira e o lugar
     * óbvio, e sobra o topo do conteúdo para o que a página tem a dizer.
     *
     * No telefone nada disso existe: uma coluna lateral roubaria metade da
     * tela, então lá continua a barra de baixo, e o cabeçalho enxuto só com
     * a marca, para a pessoa saber onde está ao chegar por um link.
     */
    <div className="flex min-h-screen">
      <AppSidebar hasDocuments={hasDocuments} email={user.email} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur md:hidden">
          <div className="flex h-14 items-center gap-3 px-6">
            <Link href="/inicio" className="flex shrink-0 items-center gap-2.5">
              <Logo size={30} />
              <span className="font-[family-name:var(--font-label)] text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-2)]">
                Wealth &amp; Wellness
              </span>
            </Link>
          </div>
        </header>

        {/* A barra de baixo é fixa, então o último cartão precisa de espaço
            para passar por baixo dela em vez de ficar metade coberto. */}
        <main className="flex-1 px-6 pb-28 pt-8 md:px-8 md:pb-12 md:pt-9">{children}</main>
      </div>

      <AppTabBar hasDocuments={hasDocuments} />
    </div>
  );
}
