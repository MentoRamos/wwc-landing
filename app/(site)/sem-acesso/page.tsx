import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
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
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <SectionHeading
          title="Esse conteúdo não está no seu acesso."
          lede="Duas razões cobrem quase todos os casos: a compra foi feita com um e-mail diferente do que você usou para entrar, ou a assinatura chegou ao fim do período pago."
        />

        <p className="prose-body mt-4">
          Me manda uma mensagem com o e-mail da compra que eu ligo os dois na hora.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button href={`https://wa.me/${WHATSAPP_NUMBER}`} variant="primary" size="lg">
            Falar no WhatsApp
          </Button>
          <Button href="/inicio" variant="quiet" size="lg">
            Voltar para a minha área
          </Button>
        </div>
      </div>
    </div>
  );
}
