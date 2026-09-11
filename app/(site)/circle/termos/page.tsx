import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { CIRCLE_PLANS, priceLabel } from '@/lib/core/circle.core';

export const metadata: Metadata = {
  title: 'Condições da assinatura',
  description: 'Preço, renovação, cancelamento e arrependimento na assinatura do W&W Circle.',
};

/**
 * The subscription's own conditions, short and next to the button.
 *
 * The platform's full terms already cover all of this. This page exists
 * because the moment somebody wants to read the cancellation rule is the
 * moment before they pay, and sending them to a twelve-section document to
 * find it loses the sale and deserves to.
 */
export default function CircleTermosPage() {
  const [monthly, quarterly] = CIRCLE_PLANS;

  return (
    <LegalPage eyebrow="W&amp;W Circle" title="Condições da assinatura">
      <Section n={1} title="Preço e periodicidade">
        <p>
          {priceLabel(monthly.priceCents)} por mês, ou{' '}
          {priceLabel(quarterly.priceCents)} a cada três meses — o equivalente a{' '}
          {priceLabel(quarterly.priceCents / quarterly.months)} por mês. A cobrança é feita
          por um processador de pagamentos externo e renova automaticamente até você
          cancelar.
        </p>
        <p>
          Mudança de preço vale apenas para ciclos futuros e é avisada antes de entrar em
          vigor.
        </p>
      </Section>

      <Section n={2} title="O que a assinatura dá">
        <p>
          O encontro ao vivo semanal, às quintas, 20h de Brasília; a gravação depois; e a
          biblioteca liberada enquanto a assinatura estiver em dia. Os guias em PDF ficam
          disponíveis para download.
        </p>
        <p>
          O Circle não é acompanhamento individual e não substitui o Protocol. Não há
          avaliação, prescrição nem plano pessoal — veja a seção 5.
        </p>
      </Section>

      <Section n={3} title="Cancelamento">
        <p>
          Você cancela quando quiser, sem multa e sem precisar justificar. O acesso continua
          até o fim do período que você já pagou e não renova depois disso. Não há corte no
          meio de um mês pago, e também não há devolução proporcional.
        </p>
        <p>
          Falha na cobrança suspende o acesso até a regularização; ela não gera dívida nem
          cobrança retroativa.
        </p>
      </Section>

      <Section n={4} title="Arrependimento">
        <p>
          Sete dias contados da contratação, com devolução integral, como manda o art. 49 do
          Código de Defesa do Consumidor. Tenha você usado a plataforma ou não.
        </p>
      </Section>

      <Section n={5} title="Isto não é consulta médica">
        <p className="text-[var(--text-1)]">
          O conteúdo é educacional. Não é diagnóstico, não é prescrição e não substitui a
          avaliação do seu médico ou nutricionista.
        </p>
        <p>
          Antes de mudar alimentação, treino, suplementação ou medicação, fale com um
          profissional habilitado que conheça seu histórico.
        </p>
      </Section>

      <Section n={6} title="O resto">
        <p>
          Compartilhamento de acesso, uso do conteúdo, encerramento e foro estão nos{' '}
          <Link href="/termos" className="text-[var(--accent)] underline underline-offset-4">
            Termos de Uso
          </Link>{' '}
          da plataforma, e o tratamento dos seus dados na{' '}
          <Link
            href="/privacidade"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            Política de Privacidade
          </Link>
          . Esta página resume o que é específico da assinatura; em caso de divergência,
          vale o texto completo.
        </p>
      </Section>
    </LegalPage>
  );
}
