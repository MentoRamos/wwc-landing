import { clsx } from 'clsx';

type Tone = 'neutral' | 'accent' | 'muted';

const TONES: Record<Tone, string> = {
  neutral: 'border-[var(--border)] text-[var(--text-3)]',
  accent: 'border-[var(--border-hover)] text-[var(--accent)]',
  muted: 'border-[var(--border)] text-[var(--text-4)]',
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
