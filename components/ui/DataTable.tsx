import { clsx } from 'clsx';

/**
 * A tabela, para onde havia lista de blocos empilhados.
 *
 * Uma lista de cartões responde bem a "o que é este item" e mal a "como
 * estes itens se comparam": cada valor fica numa linha diferente de uma
 * frase diferente, e conferir três acessos exige ler três parágrafos. Em
 * coluna, o olho desce por um campo só e a comparação sai de graça.
 *
 * No telefone ela rola na horizontal dentro do próprio quadro, em vez de
 * virar cartão de novo. Virar cartão parece mais gentil e não é: a pessoa
 * perde a única coisa que a tabela deu a ela, que é a coluna.
 */
export function DataTable({
  head,
  children,
  className,
}: {
  head: Array<{ label: string; align?: 'left' | 'right' }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'overflow-x-auto rounded-[6px] border border-[var(--border)]',
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((col) => (
              <th
                key={col.label}
                scope="col"
                className={clsx(
                  'whitespace-nowrap border-b border-[var(--border)] px-4 pb-2.5 pt-3.5 font-[family-name:var(--font-label)] text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-3)]',
                  col.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({
  children,
  strong = false,
  numeric = false,
  align,
  className,
}: {
  children: React.ReactNode;
  /** O campo que identifica a linha, que não pode ter o mesmo peso dos outros. */
  strong?: boolean;
  /** Liga `tabular-nums`, sem o qual datas em coluna não alinham no algarismo. */
  numeric?: boolean;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={clsx(
        'border-b border-[var(--border)] px-4 py-3',
        strong ? 'text-[var(--text-1)]' : 'text-[var(--text-2)]',
        numeric && 'tabular-nums',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {children}
    </td>
  );
}

/** A última linha não desenha régua: a borda do quadro já fecha a tabela. */
export function Row({ children }: { children: React.ReactNode }) {
  return (
    <tr className="transition last:[&>td]:border-b-0 hover:bg-[var(--text-1)]/[0.025]">
      {children}
    </tr>
  );
}
