'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Logo } from '@/components/ui/Logo';

/**
 * A navegação lateral do desktop, no lugar das abas no topo.
 *
 * Aba no topo é um formato que aguenta quatro itens e para de funcionar no
 * quinto: ela cresce na horizontal, disputa espaço com a marca e com o botão
 * de sair, e não tem onde separar o que é conteúdo do que é conta. A lateral
 * cresce na vertical, que é a direção em que sobra espaço, e ganha de graça
 * o agrupamento que a barra de cima não tinha onde colocar.
 *
 * Ela não recolhe em ícones. Com seis itens, o botão de recolher custa mais
 * atenção do que devolve em largura, e ícone sozinho obriga a pessoa a
 * decorar um vocabulário que ela usa duas vezes por semana.
 *
 * No telefone ela não existe: lá continua valendo a barra de baixo, que já é
 * o gesto certo para o polegar.
 */

const CONTEUDO = [
  { href: '/inicio', label: 'Início' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/circle', label: 'Encontros' },
];

const ACOMPANHAMENTO = { href: '/aluno', label: 'Você' };
const CONTA = [{ href: '/conta', label: 'Acessos' }];

function Item({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex min-h-11 items-center rounded-[3px] border-l-2 px-3 text-sm transition',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--text-1)]'
          : 'border-transparent text-[var(--text-3)] hover:bg-[var(--text-1)]/[0.03] hover:text-[var(--text-1)]',
      )}
    >
      {label}
    </Link>
  );
}

export function AppSidebar({
  hasDocuments = false,
  email,
}: {
  hasDocuments?: boolean;
  email?: string;
}) {
  const pathname = usePathname();
  const is = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const conteudo = hasDocuments ? [...CONTEUDO, ACOMPANHAMENTO] : CONTEUDO;

  return (
    <aside
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--border)] md:flex md:w-[13.5rem]"
      aria-label="Navegação"
    >
      <Link
        href="/inicio"
        className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-4"
      >
        <Logo size={30} />
        <span className="font-[family-name:var(--font-label)] text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-2)]">
          Wealth &amp; Wellness
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
        {conteudo.map((link) => (
          <Item key={link.href} {...link} active={is(link.href)} />
        ))}

        <p className="px-3 pb-1.5 pt-5 font-[family-name:var(--font-label)] text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-4)]">
          Conta
        </p>

        {CONTA.map((link) => (
          <Item key={link.href} {...link} active={is(link.href)} />
        ))}
      </nav>

      {/* O e-mail fica no rodapé da coluna, que é onde todo painel o põe, e
          resolve de quebra a pergunta "estou logado com qual conta?" que a
          barra de cima só respondia em tela larga. */}
      <div className="border-t border-[var(--border)] p-2.5">
        {email && (
          <p className="truncate px-3 pb-2 text-[0.6875rem] text-[var(--text-4)]" title={email}>
            {email}
          </p>
        )}
        <form action="/api/auth/sair" method="post">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center rounded-[3px] px-3 text-left text-sm text-[var(--text-3)] transition hover:bg-[var(--text-1)]/[0.03] hover:text-[var(--text-1)]"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
