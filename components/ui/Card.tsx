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
 */
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
  const classes = twMerge(clsx('block h-full px-6 py-5', surface, className));

  if (href) {
    return (
      <Link
        href={href}
        className={twMerge(classes, 'transition hover:bg-[var(--bg-card-hover)]')}
      >
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}

/**
 * The hairline grid the cards sit in. `gap-px` over a bordered box is what
 * draws the single-pixel rules between them without any card owning a border
 * of its own — so the first and last rows stay flush with the frame.
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
        columns === 2 && 'sm:grid-cols-2',
        stagger && 'stagger-children',
        className,
      )}
    >
      {children}
    </ul>
  );
}
