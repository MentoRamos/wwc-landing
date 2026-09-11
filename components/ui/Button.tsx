import Link from 'next/link';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'quiet';
type Size = 'md' | 'lg';

/**
 * One button, three voices.
 *
 * `primary` is the gold one, and the design system allows exactly one per
 * page: "ouro é tempero, não base". Everything else that can be clicked is
 * `secondary` (a hairline box) or `quiet` (a text link). Keeping the three in
 * one file is what stops the fourth voice from appearing the next time
 * somebody needs a button in a hurry.
 *
 * It renders a `<Link>`, an `<a>` or a `<button>` depending on what it is
 * given, so a call to action that navigates is a real link — right-clickable,
 * openable in a new tab, and visible to a crawler.
 */
const BASE =
  'inline-flex items-center justify-center gap-2 text-center font-medium uppercase ' +
  'tracking-[0.18em] transition disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<Variant, string> = {
  primary:
    'btn-glow border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]',
  secondary:
    'btn-glow border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] ' +
    'hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)]',
  quiet: 'text-[var(--text-3)] hover:text-[var(--accent)]',
};

/** 44px is the floor Apple and the WCAG target-size rule both land on. */
const SIZES: Record<Size, string> = {
  md: 'min-h-11 px-5 py-3 text-[11px]',
  lg: 'min-h-14 px-7 py-4 text-xs',
};

type Common = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = Common &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
  };

type LinkProps = Common &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
    href: string;
  };

export function Button(props: ButtonProps | LinkProps) {
  const { variant = 'secondary', size = 'md', className, children, ...rest } = props;
  const classes = clsx(BASE, VARIANTS[variant], SIZES[size], className);

  if (typeof rest.href === 'string') {
    const { href, ...anchorProps } = rest as LinkProps;
    // Anything that is not a path of our own is a real anchor: Next's Link
    // would try to prefetch it.
    const external = !href.startsWith('/');

    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
          {...anchorProps}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const { type = 'button', ...buttonProps } = rest as ButtonProps;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
