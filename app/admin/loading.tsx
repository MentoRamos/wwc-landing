/**
 * Shown while the admin screen loads the list of granted accesses.
 *
 * Skeleton rather than a spinner: the shape of what is coming is already
 * known, so the page does not jump when the answer arrives.
 */
export default function AdminLoading() {
  return (
    <div className="max-w-2xl animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-3 w-24 bg-[var(--bg-card)]" />
      <div className="mt-6 h-10 w-64 bg-[var(--bg-card)]" />
      <div className="mt-10 flex flex-col gap-px border border-[var(--border)]">
        <div className="h-24 bg-[var(--bg-card)]" />
        <div className="h-24 bg-[var(--bg-card)]" />
      </div>
    </div>
  );
}
