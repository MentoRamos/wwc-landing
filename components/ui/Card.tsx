import Link from 'next/link';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * One surface, and the question of whether it is clickable answered in one
 * place.
 *
 * Four pages had grown their own version of "a bg-card box that is a Link when
 * it has somewhere to go and a div when it does not", and they disagreed about
 * padding, about hover, and about what a card with nothing behind it should
 * look like. The last of those was the actual bug: the biblioteca dimmed the
 * whole locked card with `opacity-55`, which took its meta line to 1.9:1
 * against the surface — the "Bloqueado" state was announced by making the
 * words hard to read. A locked card now sits on its own darker ground and says
 * so in a badge.
 *
 * What a linked card does when you point at it used to be the whole of the
 * platform's interaction vocabulary: `bg-card` became `bg-card-hover`, two
 * greys 7% apart, and nothing else moved. That is a state change you can only
 * notice by comparing two screenshots. It now draws the brand's gold rule
 * along its top edge (`.rule-draw`), which is a gesture you see from the
 * corner of your eye — and the same gesture answers the keyboard, because the
 * rule is bound to `:focus-visible` too.
 */
/**
 * Este destino é uma rota, ou só um endereço?
 *
 * `next/link` faz prefetch do que entra na viewport, e isso é a feature certa
 * para uma página e o defeito errado para um endpoint com efeito. O download
 * do aluno grava `document_access_log` e assina uma URL do bucket no próprio
 * GET: com um `Link` em cima dele, abrir a lista registraria leituras que
 * ninguém fez, na única trilha que existe justamente para dizer quem leu o
 * quê.
 *
 * Fora da navegação do Next, uma âncora comum faz o que se espera: nada, até
 * alguém clicar.
 */
export function isRouteLink(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('/api/');
}

export function Card({
  href,
  locked = false,
  className,
  children,
}: {
  href?: string | null;
  locked?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const surface = locked ? 'bg-[var(--bg-locked)]' : 'bg-[var(--bg-card)]';
  const classes = twMerge(clsx('block h-full px-6 py-6', surface, className));

  if (href) {
    const interactive = twMerge(
      classes,
      'rule-draw transition-colors duration-300 hover:bg-[var(--bg-card-hover)]',
    );

    // O mesmo cartão, o mesmo gesto, e a única diferença é quem carrega o
    // destino. Uma âncora comum não busca nada antes do clique.
    if (!isRouteLink(href)) {
      return (
        <a href={href} className={interactive}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={interactive}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}

/**
 * The line a linked card ends on: what the click does, and an arrow that walks
 * when the card is pointed at.
 *
 * It exists because every linked card on the platform ended in a `Meta` line
 * that read like a caption — "Abrir a biblioteca" set in the same faint,
 * spaced caps as "PDF · 12 min". One of those is a description and the other
 * is a promise about what happens next, and they were typographically
 * identical.
 */
export function CardAction({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)]">
      {children}
      <span aria-hidden="true" className="nudge-x text-[var(--text-4)]">
        &rarr;
      </span>
    </span>
  );
}

/**
 * The hairline grid the cards sit in. `gap-px` over a bordered box is what
 * draws the single-pixel rules between them without any card owning a border
 * of its own — so the first and last rows stay flush with the frame.
 *
 * O preço de desenhar uma moldura em volta de um grid é que a última linha
 * precisa fechar. Com número ímpar de itens em duas colunas ela não fechava: a
 * biblioteca tem cinco guias, então sobrava uma célula vazia embaixo à
 * direita, mais escura que os cartões e emoldurada junto com eles — lia como
 * cartão que não carregou.
 *
 * A saída não é escolher outro número de colunas (o problema volta com seis
 * itens em três) nem esconder a moldura. É o último cartão ocupar a linha
 * inteira quando ele está sozinho nela. `:last-child:nth-child(odd)` diz
 * exatamente isso e nada mais: só dispara quando o elemento é o último E está
 * em posição ímpar, ou seja, quando ele abriu uma linha que ninguém fechou.
 */
export function CardGrid({
  columns = 1,
  stagger = true,
  className,
  children,
}: {
  columns?: 1 | 2;
  stagger?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul
      className={clsx(
        'grid gap-px overflow-hidden border border-[var(--border)]',
        columns === 2 && 'sm:grid-cols-2 sm:[&>li:last-child:nth-child(odd)]:col-span-2',
        stagger && 'stagger-children',
        className,
      )}
    >
      {children}
    </ul>
  );
}
