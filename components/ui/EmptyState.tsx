/**
 * What a page says when it has nothing to show.
 *
 * Always three things: what is missing, why that is, and the one thing to do
 * about it. A bare "nada aqui" makes someone wonder whether the page is broken
 * or whether they are.
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--border)] bg-[var(--bg-card)] px-6 py-8">
      <p className="text-[var(--text-1)]">{title}</p>
      {children && <div className="prose-body mt-3">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}
