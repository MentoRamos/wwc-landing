import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { currentUser } from '@/lib/auth/guard';
import { safeNextPath } from '@/lib/core/auth.core';

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse a plataforma Wealth & Wellness.',
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  'sem-codigo': 'O Google voltou sem confirmar o login. Tente entrar de novo.',
  falhou: 'Não consegui concluir o login. Tente de novo.',
  cancelado: 'O login foi cancelado antes de terminar.',
};

/**
 * A porta da plataforma, que é a primeira tela que qualquer pessoa vê.
 *
 * Era uma coluna de 384px centralizada no preto: um título "Entrar", um botão
 * e a linha legal. Correto e sem nenhuma presença — a única tela da marca em
 * que não havia marca nenhuma, justamente na hora em que alguém decide se
 * confia o login do Google a este endereço.
 *
 * Agora ela é uma composição de duas metades, que é como uma peça editorial
 * trata uma abertura: a imagem sustenta um lado, o gesto fica sozinho no
 * outro. A foto sangra até a borda da janela em vez de morar num cartão,
 * porque foto emoldurada dentro de página escura lê como ilustração de
 * apoio, e aqui ela é metade do argumento.
 */
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  // Already signed in: nothing to do here.
  if (await currentUser()) redirect(next);

  const error = params.erro ? ERRORS[params.erro] : undefined;

  return (
    /* A altura mínima existe porque a linha do grid era definida pelo conteúdo
       da coluna do formulário (~550px) e a imagem parava ali, deixando uma
       faixa preta entre ela e o rodapé. Numa composição de duas metades a
       imagem tem que chegar até embaixo, senão ela lê como cartão recortado.
       `4rem` é a altura real do cabeçalho (`h-16`). */
    <div className="grid flex-1 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* A metade da imagem. Some no telefone: ali ela roubaria a dobra
          inteira e empurraria o botão para baixo do teclado. */}
      <div className="relative hidden lg:block">
        <Image
          src="/photos/kaua-presenting.jpg"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        {/* O degradê vem da direita, contra a emenda com a coluna do
            formulário: sem ele existe uma linha vertical dura no meio da tela,
            que é a primeira coisa que o olho encontra. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/70 via-transparent to-[var(--bg)]"
        />

        <div className="absolute inset-x-0 bottom-0 p-12">
          <div className="rule-gold" aria-hidden="true" />
          <p className="mt-6 max-w-sm font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--text-1)]">
            Saúde baseada em dados para quem decide o dia inteiro e esquece de
            decidir <em className="accent-word">sobre si</em>.
          </p>
        </div>
      </div>

      {/* A metade do gesto. Um botão, e nada competindo com ele. */}
      <div className="flex items-center justify-center px-6 py-20 lg:px-16">
        <div className="w-full max-w-sm">
          <p className="eyebrow">Wealth &amp; Wellness</p>
          <h1 className="page-title mt-4">Entrar</h1>
          <div className="rule-gold mt-6" aria-hidden="true" />

          <p className="lede mt-7">
            Use o mesmo e-mail da sua compra. Se o acesso ainda não aparecer, entre
            assim mesmo: eu libero pelo seu endereço.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-7 border-l-2 border-[var(--accent)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-2)]"
            >
              {error}
            </p>
          )}

          <div className="mt-9">
            <GoogleButton next={next} />
          </div>

          <p className="mt-9 text-xs leading-relaxed text-[var(--text-4)]">
            Entrando, você concorda com os{' '}
            <Link href="/termos" className="underline underline-offset-4 hover:text-[var(--text-2)]">
              termos de uso
            </Link>{' '}
            e com a{' '}
            <Link
              href="/privacidade"
              className="underline underline-offset-4 hover:text-[var(--text-2)]"
            >
              política de privacidade
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
