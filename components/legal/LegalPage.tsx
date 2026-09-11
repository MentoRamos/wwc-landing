import Link from 'next/link';
import { LEGAL_IS_DRAFT, LEGAL_UPDATED } from '@/lib/legal';

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
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">{eyebrow}</p>
        <h1 className="mt-4 text-4xl">{title}</h1>
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--text-4)]">
          Atualizada em {new Date(`${LEGAL_UPDATED}T12:00:00Z`).toLocaleDateString('pt-BR')}
        </p>

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

        <footer className="mt-16 border-t border-[var(--border)] pt-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)] transition hover:text-[var(--accent)]"
          >
            Voltar ao início
          </Link>
        </footer>
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
