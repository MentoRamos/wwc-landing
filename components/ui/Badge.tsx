import { clsx } from 'clsx';

type Tone = 'neutral' | 'accent' | 'muted' | 'good' | 'warn';

/**
 * `good` e `warn` carregam fundo lavado, e os outros três não.
 *
 * Não é inconsistência: esses dois são os únicos que dizem estado de uma
 * coisa que pode dar errado, e são os únicos que precisam ser achados numa
 * varredura de olho por uma tabela de doze linhas. Contorno sozinho não é
 * encontrado nessa varredura; fundo é. Os outros três rotulam, não alertam.
 */
const TONES: Record<Tone, string> = {
  neutral: 'border-[var(--border)] text-[var(--text-3)]',
  accent: 'border-[var(--border-hover)] text-[var(--accent)]',
  muted: 'border-[var(--border)] text-[var(--text-4)]',
  good: 'border-[var(--good)]/45 bg-[var(--good-glow)] text-[var(--good-text)]',
  warn: 'border-[var(--warn)]/45 bg-[var(--warn-glow)] text-[var(--warn-text)]',
};

/**
 * The small word that says what state a thing is in: Bloqueado, Vitalício,
 * em breve. It carries a hairline box so it reads as a label and not as the
 * start of a sentence.
 */
export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
