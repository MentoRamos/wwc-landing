import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  robots: { index: false, follow: false },
};

/**
 * The 404 every `notFound()` on the platform lands on.
 *
 * Until now there was none, so a member who asked for a replay they do not
 * hold — the commonest 404 here by far, because refusal and absence answer
 * identically on purpose — got the framework's bare default: black text,
 * white background, in English. It read as a broken site rather than as an
 * answer.
 *
 * It does not guess why. A locked replay and a mistyped address arrive here
 * the same way, and telling someone "você não tem acesso a isto" when they
 * simply mistyped is worse than saying nothing.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <SectionHeading
          eyebrow="404"
          title="Não achei essa página."
          lede="Ou o endereço mudou, ou esse conteúdo não está no seu acesso. As duas coisas respondem igual aqui, de propósito."
        />

        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/inicio" variant="primary">
            Ir para a sua área
          </Button>
          <Button href="/sem-acesso" variant="quiet">
            Comprei e não apareceu
          </Button>
        </div>
      </div>
    </div>
  );
}
