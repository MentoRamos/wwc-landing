import { clsx } from 'clsx';

/**
 * A label, its control, and at most one line under it — always in that order
 * and always joined by `htmlFor`, so tapping the label focuses the field. That
 * is the whole point: on a phone the label is a much bigger target than the
 * input's own edge.
 *
 * The hint and the error get ids derived from the control's, and the caller
 * spreads `describedBy(id, { error })` onto the control. Wiring it by hand is
 * what gets forgotten, and an error a screen reader never announces is an
 * error that did not happen.
 */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-[var(--accent)]">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs leading-relaxed text-[var(--text-4)]">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Spread onto the control inside a `<Field>` with the same id and flags. */
export function describedBy(
  id: string,
  { hint, error }: { hint?: unknown; error?: unknown },
): { 'aria-describedby'?: string; 'aria-invalid'?: true } {
  if (error) return { 'aria-describedby': `${id}-error`, 'aria-invalid': true };
  if (hint) return { 'aria-describedby': `${id}-hint` };
  return {};
}

export const INPUT_CLASS =
  'w-full min-h-11 border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm ' +
  'text-[var(--text-1)] transition placeholder:text-[var(--text-4)] ' +
  'focus:border-[var(--border-hover)] focus:outline-none';
