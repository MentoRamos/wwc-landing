import type { Metadata } from 'next';
import Link from 'next/link';
import { WHATSAPP_NUMBER } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Sem acesso',
  description: 'O que fazer quando o acesso não aparece.',
  robots: { index: false, follow: false },
};

/**
 * The honest dead end.
 *
 * Someone lands here having paid, so the page's job is to say what went wrong
 * in plain terms and give one way out — not to apologise or to hide the cause.
 * The commonest cause by far is paying with one address and signing in with
 * another.
 */
export default function SemAcessoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">
          Wealth &amp; Wellness
        </p>
        <h1 className="mt-4 text-4xl">Esse conteúdo não está no seu acesso.</h1>

        <p className="mt-6 text-sm leading-relaxed text-[var(--text-2)]">
          Duas razões cobrem quase todos os casos: a compra foi feita com um
          e-mail diferente do que você usou para entrar, ou a assinatura chegou
          ao fim do período pago.
        </p>

        <p className="mt-4 text-sm leading-relaxed text-[var(--text-2)]">
          Me manda uma mensagem com o e-mail da compra que eu ligo os dois na
          hora.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow border border-[var(--border-hover)] bg-[var(--bg-card)] px-6 py-4 text-center text-sm font-medium transition hover:bg-[var(--bg-card-hover)]"
          >
            Falar no WhatsApp
          </a>
          <Link
            href="/inicio"
            className="px-6 py-3 text-center text-sm text-[var(--text-3)] transition hover:text-[var(--text-1)]"
          >
            Voltar para a minha área
          </Link>
        </div>
      </div>
    </div>
  );
}
