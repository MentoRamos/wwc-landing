import Link from 'next/link';
import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { roman } from '@/lib/core/roman.core';

/**
 * A capa vertical, e a prateleira que as enfileira.
 *
 * A biblioteca era grade de cartão deitado, que é a forma de uma lista de
 * arquivos. Todas as plataformas do setor convergiram na mesma outra forma
 * para acervo — capa vertical em proporção 2:3, enfileirada na horizontal —
 * e a razão não é moda: deitado cabem três por linha e o título disputa
 * espaço com a imagem; em pé cabem cinco, o olho varre a fileira inteira de
 * uma vez, e o título tem a largura toda embaixo.
 *
 * A arte é tipográfica de propósito. Onze capas em arquivo seriam onze peças
 * para produzir antes de a tela poder mudar, mais onze para cada guia novo.
 * O algarismo romano em degradê pertence à família da marca, nasce pronto
 * para qualquer item futuro, e não custa download.
 */
export function Poster({
  href,
  title,
  index,
  meta,
  locked = false,
  done = false,
  fresh = false,
  percent,
}: {
  href: string;
  title: string;
  /** Posição na prateleira, contada a partir de 1. Vira o romance da capa. */
  index: number;
  meta?: string;
  locked?: boolean;
  done?: boolean;
  fresh?: boolean;
  /** Progresso parcial, 1 a 99. Fora disso não desenha nada. */
  percent?: number;
}) {
  const partial = typeof percent === 'number' && percent > 0 && percent < 100;

  const art = (
    <div
      className={clsx(
        'relative grid aspect-[2/3] place-items-center overflow-hidden rounded-[6px] border transition',
        locked
          ? 'border-[var(--border)] opacity-50'
          : 'border-[var(--border)] group-hover:-translate-y-0.5 group-hover:border-[var(--accent)]',
      )}
      style={{ background: 'linear-gradient(155deg, #23201A, #131313 62%)' }}
    >
      <span
        aria-hidden="true"
        className="font-[family-name:var(--font-display)] text-[1.75rem] text-[var(--accent)]/40"
      >
        {roman(index)}
      </span>

      {/* Um selo por capa, e a ordem resolve o empate: concluído ganha de
          novo, porque quem já terminou não precisa saber que era novidade. */}
      {(done || fresh || locked) && (
        <span className="absolute left-2 top-2">
          {locked ? (
            <Badge tone="muted">Bloqueado</Badge>
          ) : done ? (
            <Badge tone="good">Concluído</Badge>
          ) : (
            <Badge tone="accent">Novo</Badge>
          )}
        </span>
      )}

      {partial && (
        <span className="absolute inset-x-0 bottom-0 block h-[3px] bg-[var(--text-1)]/10">
          <span className="block h-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
        </span>
      )}
    </div>
  );

  const label = (
    <>
      <p
        className={clsx(
          'mt-2.5 text-[0.8125rem] leading-snug',
          locked ? 'text-[var(--text-3)]' : 'text-[var(--text-1)]',
        )}
      >
        {title}
      </p>
      {meta && (
        <p className="font-[family-name:var(--font-label)] text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--text-4)]">
          {meta}
        </p>
      )}
    </>
  );

  // Sem direito não há destino: um cadeado que navega para 404 é pior do que
  // um cadeado que não navega.
  if (locked) {
    return (
      <div className="w-[8.5rem] shrink-0 snap-start sm:w-[9.5rem]">
        {art}
        {label}
      </div>
    );
  }

  return (
    <Link href={href} className="group w-[8.5rem] shrink-0 snap-start sm:w-[9.5rem]">
      {art}
      {label}
    </Link>
  );
}

/**
 * A fileira rolável.
 *
 * `-mx-*` com `px-*` de volta faz a rolagem sangrar até a borda da tela no
 * telefone, sem tirar o alinhamento do primeiro item com o resto da coluna.
 * Sem isso a última capa encosta numa parede invisível e parece que a
 * prateleira acabou ali.
 */
export function PosterRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 mt-5 flex snap-x gap-3.5 overflow-x-auto px-6 pb-2 sm:mx-0 sm:px-0">
      {children}
    </div>
  );
}
