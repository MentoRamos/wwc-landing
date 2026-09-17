/**
 * Uma faixa: o rótulo editorial à esquerda, o conteúdo à direita, ocupando a
 * largura inteira do container.
 *
 * É a gramática que o `/circle` público já usava e que a área logada não
 * tinha. Lá, cada seção era um bloco de 672px (`max-w-2xl`) encostado à
 * esquerda de um container de 1440px, então o cabeçalho ia de ponta a ponta e
 * o conteúdo parava no meio — o que o design system chama, com essas palavras,
 * de falha de enquadramento.
 *
 * A correção não é esticar o conteúdo até a borda. Um cartão de 1300px lê como
 * faixa de banner, não como objeto. É dar à seção a coluna que faltava: o que
 * a seção é fica à esquerda, em tipo pequeno, e o que se faz nela fica à
 * direita, com mais espaço — 0.8fr contra 1.2fr, a mesma proporção das faixas
 * de preço.
 *
 * `min-w-0` na coluna de conteúdo não é enfeite. Filho de grid nasce com
 * `min-width: auto`, então um título longo ou uma tabela larga empurra a
 * coluna para fora da faixa em vez de quebrar dentro dela.
 */
export function Band({
  eyebrow,
  title,
  lede,
  first = false,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** A primeira faixa da página não leva fio em cima: já há o cabeçalho. */
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={first ? '' : 'border-t border-[var(--border)] pt-10 md:pt-14'}>
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="section-title mt-4">{title}</h2>
          <div className="rule-gold mt-6" aria-hidden="true" />
          {lede && <p className="prose-body mt-6">{lede}</p>}
        </div>

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
