/**
 * Shown while /inicio asks the database what this person may see.
 *
 * Skeleton rather than a spinner: the shape of what is coming is already
 * known, so the page does not jump when the answer arrives.
 *
 * Deliberately here and not one level up in `(app)`. A loading.tsx creates a
 * Suspense boundary, and streaming commits a 200 before the page runs — so any
 * `notFound()` below it renders the 404 page under an HTTP 200. /inicio never
 * calls notFound(), so it can stream; /biblioteca/[slug] lives on that refusal
 * and must not. See tests/no-streaming-above-404.test.ts, which enforces it.
 */
export default function InicioLoading() {
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
