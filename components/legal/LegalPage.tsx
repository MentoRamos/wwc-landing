import { LEGAL_IS_DRAFT, LEGAL_UPDATED } from '@/lib/legal';
import { formatDate } from '@/lib/core/format.core';

/**
 * The shared frame for the privacy policy and the terms.
 *
 * Long-form legal text is read by someone looking for one specific answer, so
 * it gets a narrow measure, real heading hierarchy and numbered sections they
 * can point at — not the page chrome the marketing pages use.
 */
export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-16">
      <article className="mx-auto w-full max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title mt-4">{title}</h1>
        <p className="meta mt-4">Atualizada em {formatDate(`${LEGAL_UPDATED}T12:00:00Z`)}</p>

        {LEGAL_IS_DRAFT && (
          <div
            role="alert"
            className="mt-8 border border-[var(--accent)] px-5 py-4 text-sm leading-relaxed text-[var(--text-2)]"
          >
            <strong className="text-[var(--text-1)]">Rascunho.</strong> Faltam a
            identificação do controlador e o endereço de contato. Enquanto isso este
            texto não vale como política publicada e a página não é indexada.
          </div>
        )}

        <div className="legal mt-12 flex flex-col gap-10">{children}</div>

      </article>
    </div>
  );
}

/** One numbered section. The number is what someone quotes back at you. */
export function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg text-[var(--text-1)]">
        <span className="mr-3 text-[var(--text-4)] tabular-nums">{n}.</span>
        {title}
      </h2>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-[var(--text-2)]">
        {children}
      </div>
    </section>
  );
}
