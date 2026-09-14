import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { LEGAL, LEGAL_IS_DRAFT, pending } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'As regras da plataforma Wealth & Wellness: acesso, assinatura, cancelamento e uso do conteúdo.',
  robots: LEGAL_IS_DRAFT ? { index: false, follow: false } : undefined,
};

const controller = () => pending(LEGAL.controller, 'razão social ou nome do controlador');
const contact = () => pending(LEGAL.contactEmail, 'e-mail de contato');

/**
 * O documento é opcional (ver `lib/legal.ts`), então ele aparece como oração
 * inteira ou não aparece — nunca como um "inscrito sob" pendurado no vazio.
 */
const registration = () => (LEGAL.taxId ? `, inscrito sob ${LEGAL.taxId},` : '');

/**
 * The other half of the Google Branding gate.
 *
 * Section 8 is the one that matters most for Kauã's own exposure: this is a
 * health product, and the terms have to say in plain words that it does not
 * replace a doctor.
 */
export default function TermosPage() {
  return (
    <LegalPage eyebrow="Wealth &amp; Wellness" title="Termos de Uso">
      <Section n={1} title="Do que se trata">
        <p>
          Estes termos regem o uso da plataforma Wealth &amp; Wellness, operada
          por {controller()}{registration()}. Ao entrar com sua conta
          Google, você concorda com o que está escrito aqui. Se não concordar,
          não entre — e, se já entrou, peça o encerramento pela seção 11.
        </p>
      </Section>

      <Section n={2} title="Sua conta">
        <p>
          O acesso é pessoal e intransferível, e a entrada é feita pela sua conta
          Google. Você precisa ter 18 anos ou mais. O acesso é ligado ao endereço
          de e-mail: se você comprar com um endereço e entrar com outro, o acesso
          não aparece sozinho — fale com a gente que ligamos os dois.
        </p>
        <p>
          Compartilhar seu acesso, ou o conteúdo que ele abre, com quem não pagou
          encerra a conta sem devolução do valor.
        </p>
      </Section>

      <Section n={3} title="O que cada produto dá">
        <p>
          <strong className="text-[var(--text-1)]">Protocol.</strong>{' '}
          Acompanhamento individual por período contratado, com os documentos do
          seu ciclo. A biblioteca fica sua em definitivo, mesmo depois de o ciclo
          terminar.
        </p>
        <p>
          <strong className="text-[var(--text-1)]">Circle.</strong> Assinatura:
          encontro ao vivo semanal e biblioteca liberada enquanto a assinatura
          estiver em dia.
        </p>
        <p>
          <strong className="text-[var(--text-1)]">Connect.</strong> Acesso de
          convidado do evento, nos termos daquela edição.
        </p>
        <p>
          O que a plataforma entrega é acesso a conteúdo e a encontros. Nenhum
          produto promete resultado de saúde, estética ou desempenho — veja a
          seção 8.
        </p>
      </Section>

      <Section n={4} title="Pagamento e renovação">
        <p>
          As assinaturas são cobradas por um processador de pagamentos externo,
          no valor e na periodicidade mostrados no momento da compra, e renovam
          automaticamente até que você cancele. Mudança de preço vale só para
          ciclos futuros e é avisada antes.
        </p>
        <p>
          Falha na cobrança suspende o acesso até a regularização; ela não gera
          dívida nem cobrança retroativa.
        </p>
      </Section>

      <Section n={5} title="Cancelamento">
        <p>
          Você cancela quando quiser, sem multa e sem precisar justificar. O
          acesso continua até o fim do período que você já pagou e não renova
          depois disso — não há corte no meio de um mês pago nem devolução
          proporcional.
        </p>
      </Section>

      <Section n={6} title="Arrependimento e reembolso">
        <p>
          Compra feita pela internet tem sete dias de arrependimento, contados da
          contratação, como manda o art. 49 do Código de Defesa do Consumidor.
          Dentro desse prazo o valor é devolvido integralmente, tenha você usado
          a plataforma ou não. Basta pedir por {contact()}.
        </p>
        <p>Passados os sete dias, vale a regra de cancelamento da seção 5.</p>
      </Section>

      <Section n={7} title="O conteúdo é nosso, o acesso é seu">
        <p>
          Gravações, materiais, documentos e a marca continuam sendo de quem
          opera a plataforma. Você recebe uma licença pessoal, limitada e
          intransferível para assistir e baixar para uso próprio.
        </p>
        <p>
          Não é permitido redistribuir, republicar, revender, exibir
          publicamente, usar para treinar modelos, nem compartilhar links de
          vídeo com quem não tem acesso. O que você escrever ou enviar continua
          seu; você só nos autoriza a exibir aquilo dentro da plataforma.
        </p>
      </Section>

      <Section n={8} title="Isto não é consulta médica">
        <p className="text-[var(--text-1)]">
          O conteúdo tem finalidade educacional e informativa. Ele não é
          diagnóstico, não é prescrição e não substitui a avaliação do seu
          médico, nutricionista ou profissional de saúde.
        </p>
        <p>
          Antes de mudar alimentação, treino, suplementação ou qualquer
          medicamento, fale com um profissional habilitado, que conhece seu
          histórico. Nada aqui manda você interromper, iniciar ou alterar um
          tratamento em curso. Se tiver condição de saúde diagnosticada, estiver
          grávida ou usar medicação contínua, essa conversa é obrigatória.
        </p>
        <p>
          Você é responsável pelas decisões que tomar sobre o próprio corpo.
          Diante de emergência, procure atendimento médico — não a plataforma.
        </p>
      </Section>

      <Section n={9} title="Disponibilidade">
        <p>
          Fazemos o possível para manter tudo no ar, sem prometer que estará. Há
          manutenção, há falha de fornecedor e há imprevisto. Interrupção longa e
          atribuível a nós é compensada em tempo de assinatura.
        </p>
      </Section>

      <Section n={10} title="Limite de responsabilidade">
        <p>
          Nos limites do que a lei brasileira permite, a responsabilidade por
          perdas ligadas ao uso da plataforma fica limitada ao valor que você
          pagou nos doze meses anteriores ao fato. Esse limite não se aplica a
          dolo, a culpa grave, nem a direitos que o Código de Defesa do
          Consumidor não deixa afastar.
        </p>
      </Section>

      <Section n={11} title="Encerramento">
        <p>
          Você pode encerrar sua conta a qualquer momento escrevendo para{' '}
          {contact()}. Podemos encerrar a sua em caso de descumprimento destes
          termos — em especial o compartilhamento de acesso ou a redistribuição
          de conteúdo — avisando você, salvo quando a lei exigir o contrário.
        </p>
      </Section>

      <Section n={12} title="Mudanças, lei e foro">
        <p>
          Mudanças nestes termos aparecem nesta página com nova data, e as
          relevantes são avisadas por e-mail antes de valer. Continuar usando a
          plataforma depois disso é aceitá-las.
        </p>
        <p>
          Aplica-se a lei brasileira. Fica eleito o foro do domicílio do
          consumidor para qualquer disputa.
        </p>
        <p>
          O tratamento dos seus dados está descrito na{' '}
          <Link
            href="/privacidade"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            Política de Privacidade
          </Link>
          , que faz parte destes termos.
        </p>
      </Section>
    </LegalPage>
  );
}
