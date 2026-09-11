import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { currentUser } from '@/lib/auth/guard';
import { safeNextPath } from '@/lib/core/auth.core';

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse a plataforma Wealth & Wellness.',
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  'sem-codigo': 'O Google voltou sem confirmar o login. Tente entrar de novo.',
  falhou: 'Não consegui concluir o login. Tente de novo.',
  cancelado: 'O login foi cancelado antes de terminar.',
};

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  // Already signed in: nothing to do here.
  if (await currentUser()) redirect(next);

  const error = params.erro ? ERRORS[params.erro] : undefined;

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <SectionHeading
          eyebrow={'Wealth & Wellness'}
          title="Entrar"
          lede="Use o mesmo e-mail da sua compra. Se o acesso ainda não aparecer, entre assim mesmo: eu libero pelo seu endereço."
        />

        {error && (
          <p
            role="alert"
            className="mt-6 border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-2)]"
          >
            {error}
          </p>
        )}

        <div className="mt-8">
          <GoogleButton next={next} />
        </div>

        <p className="mt-8 text-xs leading-relaxed text-[var(--text-4)]">
          Entrando, você concorda com os{' '}
          <Link href="/termos" className="underline underline-offset-4 hover:text-[var(--text-2)]">
            termos de uso
          </Link>{' '}
          e com a{' '}
          <Link
            href="/privacidade"
            className="underline underline-offset-4 hover:text-[var(--text-2)]"
          >
            política de privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
