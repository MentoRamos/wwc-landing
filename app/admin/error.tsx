'use client';

/**
 * When the admin screen fails.
 *
 * `unstable_retry` rather than `reset`: the realistic failure here is the
 * database not answering, and re-rendering the same children without fetching
 * again would just show the same error. The doc for Next 16 says as much —
 * `reset` is for clearing error state without re-fetching, which is not this.
 *
 * The message deliberately says nothing about what broke. Errors forwarded
 * from Server Components arrive with their details already stripped, and the
 * digest is the only thing that ties this screen to a server log.
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="max-w-md">
      <h1 className="text-3xl">Alguma coisa quebrou aqui.</h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--text-2)]">
        Nenhuma concessão foi perdida — o que falhou foi a leitura, não a escrita.
        Confira a lista depois de tentar de novo.
      </p>

      <button
        type="button"
        onClick={() => unstable_retry()}
        className="btn-glow mt-8 border border-[var(--border-hover)] bg-[var(--bg-card)] px-6 py-4 text-sm font-medium transition hover:bg-[var(--bg-card-hover)]"
      >
        Tentar de novo
      </button>

      {error.digest && (
        <p className="mt-6 font-mono text-xs text-[var(--text-4)]">
          Código: {error.digest}
        </p>
      )}
    </div>
  );
}
