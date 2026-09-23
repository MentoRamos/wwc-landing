import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { LEGAL, LEGAL_IS_DRAFT, PROCESSORS, pending } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Quais dados o kauaramos.com trata, do material que você baixa à assinatura do Circle, por quê, e como pedir para apagá-los.',
  robots: LEGAL_IS_DRAFT ? { index: false, follow: false } : undefined,
};

const controller = () => pending(LEGAL.controller, 'nome do controlador');
const contact = () => pending(LEGAL.contactEmail, 'e-mail de contato');

/**
 * Uma política para o domínio inteiro.
 *
 * Antes desta versão existiam duas: uma estática, publicada em julho, que
 * falava do funil (isca, pixel, chat, anamnese) e não sabia que a plataforma
 * existia; e esta, que falava da plataforma e não sabia que o funil existia.
 * As duas eram verdadeiras pela metade, e meia verdade numa política é o mesmo
 * que declaração falsa — inclusive para o Google, que exige uma única URL
 * descrevendo o uso dos dados da conta antes de tirar o app do modo Testing.
 *
 * Organizada por "o que você fez no site", não por sistema, porque é assim que
 * alguém procurando uma resposta específica lê. O que ainda não existe é dito
 * como não existindo, nunca prometido no presente.
 */
export default function PrivacidadePage() {
  return (
    <LegalPage eyebrow="Wealth &amp; Wellness" title="Política de Privacidade">
      <Section n={1} title="Quem trata seus dados">
        <p>
          O responsável pelo tratamento descrito aqui é {controller()}, a quem a
          LGPD (Lei 13.709/2018) chama de controlador. Esta política vale para
          tudo que roda em kauaramos.com: as páginas públicas, os materiais, o
          chat, o formulário de preparação e a plataforma com login: o W&amp;W
          Circle, a Biblioteca e a sua área.
        </p>
        <p>
          Para qualquer assunto desta política, incluindo os pedidos da seção 7,
          escreva para {contact()}.
        </p>
      </Section>

      <Section n={2} title="O que é coletado, e quando">
        <p>
          <strong className="text-[var(--text-1)]">Quando você baixa um material.</strong>{' '}
          Nome, e-mail, WhatsApp e a origem do clique, de qual campanha ou link
          você veio. O WhatsApp serve para falar com você sobre o conteúdo e o
          acompanhamento. Não é vendido nem repassado, e é só pedir que eu apago.
        </p>
        <p>
          <strong className="text-[var(--text-1)]">Quando você entra na plataforma.</strong>{' '}
          A entrada é feita pelo Google e só por ele. Ao autorizar, recebemos seu
          nome, seu endereço de e-mail e a foto do perfil. Não pedimos e não
          recebemos sua senha, nem acesso a Gmail, Drive, Agenda, contatos ou
          qualquer outro serviço Google.
        </p>
        <p>
          <strong className="text-[var(--text-1)]">Quando você assina ou compra.</strong>{' '}
          O pagamento é processado por um serviço externo. O número completo do
          cartão nunca passa por esta plataforma nem fica armazenado aqui;
          recebemos a confirmação, os seus dados de contato e um identificador da
          transação. Guardamos qual produto você tem direito a ver, desde quando
          e até quando, e se aquilo veio de uma compra ou de uma liberação feita
          à mão.
        </p>
        <p>
          <strong className="text-[var(--text-1)]">Quando você usa a Biblioteca.</strong>{' '}
          O ponto em que você parou em cada gravação e quais materiais baixou,
          para a plataforma continuar de onde você deixou.
        </p>
        <p>
          <strong className="text-[var(--text-1)]">Quando você navega.</strong> Se
          você aceitar os cookies, o pixel da Meta registra quais páginas
          públicas você viu. Se recusar, nada disso é carregado. Dentro da
          plataforma não há pixel nem rastreamento de terceiros.
        </p>
        <p>
          <strong className="text-[var(--text-1)]">Quando você usa o chat.</strong> O
          que você escreve é processado pelo Google Gemini para gerar a resposta.
          Se deixar nome e contato, eles ficam comigo para eu poder te responder.
          Não escreva dados de saúde sensíveis ali: o chat existe para indicar o
          caminho certo, não para avaliar o seu caso.
        </p>
      </Section>

      <Section n={3} title="Dados de saúde, que têm regra própria">
        <p>
          O formulário de preparação coleta dados de saúde, porque é do que a
          sessão depende: peso e altura, condições diagnosticadas, medicamentos e
          doses, suplementos, cirurgias, dores e lesões, alimentação, sono,
          rotina e as suas metas. A lei chama isso de dado pessoal sensível, e
          por isso o tratamento é diferente do resto desta página.
        </p>
        <p>
          A base legal é o seu <em>consentimento específico</em>: aquele quadrado
          que você marca no fim do formulário, separado de qualquer outro aceite.
          O dado é usado só para analisar o seu caso e montar o seu plano. Fica
          em um arquivo próprio, separado da lista de contatos. Não é
          compartilhado com ninguém sem a sua autorização, não alimenta anúncio e
          não vai para o chat do site. Você pode retirar o consentimento e pedir a
          exclusão a qualquer momento, e isso encerra o uso daqui para frente.
        </p>
        <p>
          Esses dados não ficam na área de membros enquanto esta política estiver
          nesta versão.
        </p>
        <p>
          Vale dizer com todas as letras: nada disso é atendimento médico. Não há
          diagnóstico, não há indicação de medicamento e não substitui quem cuida
          clinicamente de você. O trabalho é ler o conjunto e organizar
          prioridades.
        </p>
      </Section>

      <Section n={4} title="Por que, e com qual base legal">
        <p>
          Identificar você e liberar o que você comprou é{' '}
          <em>execução de contrato</em> (art. 7º, V). Manter registro de compras e
          emissão fiscal é <em>obrigação legal</em> (art. 7º, II). Manter a
          plataforma de pé e protegida contra abuso é <em>legítimo interesse</em>{' '}
          (art. 7º, IX). O material que você baixou, os e-mails que não sejam
          sobre o seu acesso, os cookies de medição e os dados de saúde dependem
          do seu <em>consentimento</em>, que você pode retirar a qualquer momento.
        </p>
        <p>
          Seus dados não são vendidos, alugados nem cedidos para publicidade de
          terceiros. Nunca.
        </p>
      </Section>

      <Section n={5} title="Uso dos dados da sua conta Google">
        <p>
          O uso das informações recebidas das APIs do Google segue a{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            Política de Dados do Usuário dos Serviços de API do Google
          </a>
          , incluindo os requisitos de Uso Limitado. Em termos práticos: nome,
          e-mail e foto são usados apenas para identificar você dentro da
          plataforma e ligar sua conta ao que você comprou. Não usamos esses
          dados para publicidade, não os transferimos a terceiros fora do
          necessário para operar o serviço, e nenhuma pessoa os lê a não ser para
          um suporte que você mesmo pediu ou por exigência legal.
        </p>
      </Section>

      <Section n={6} title="Com quem os dados são compartilhados">
        <p>
          Só com quem é necessário para o site e a plataforma funcionarem, e cada
          um recebe apenas o que precisa:
        </p>
        <ul className="flex flex-col gap-3">
          {PROCESSORS.map((processor) => (
            <li key={processor.id}>
              <strong className="text-[var(--text-1)]">{processor.name}</strong>{' '}
              recebe {processor.gets}, {processor.why}.
            </li>
          ))}
        </ul>
      </Section>

      <Section n={7} title="Seus direitos">
        <p>
          O art. 18 da LGPD lhe dá o direito de confirmar que existe tratamento,
          acessar seus dados, corrigir o que estiver errado, pedir anonimização
          ou eliminação, pedir portabilidade, saber com quem compartilhamos e
          retirar um consentimento que tenha dado. Nada disso cobra nada.
        </p>
        <p>
          Escreva para {contact()}. A resposta sai em até 15 dias. Para apagar a
          conta inteira basta dizer isso na mensagem. Não há formulário escondido
          nem etapa de retenção. Todo e-mail enviado tem link de descadastro em um
          clique, e o consentimento dos cookies você revoga limpando os dados do
          site no seu navegador.
        </p>
      </Section>

      <Section n={8} title="Por quanto tempo ficam guardados">
        <p>
          Os dados da sua conta ficam enquanto ela existir. Registros de compra e
          de acesso ficam pelo prazo que a legislação fiscal e civil exige, mesmo
          depois de a conta ser encerrada, porque são prova de uma relação que
          existiu. Apagada a conta, o que não estiver preso a essa obrigação é
          apagado ou anonimizado.
        </p>
      </Section>

      <Section n={9} title="Segurança">
        <p>
          O acesso de cada pessoa é decidido no próprio banco de dados, por
          políticas por linha: uma consulta feita por você devolve apenas o que é
          seu, e não existe uma checagem na aplicação que alguém possa esquecer de
          escrever. O tráfego é cifrado em trânsito e os dados em repouso. As
          chaves administrativas ficam fora do navegador.
        </p>
        <p>
          Nenhum sistema é imune. Se houver um incidente com risco relevante a
          você, a comunicação é feita a você e à ANPD, como manda o art. 48.
        </p>
      </Section>

      <Section n={10} title="Cookies">
        <p>
          Dentro da plataforma os cookies servem para uma coisa só: manter você
          logado entre uma página e outra. Apagá-los desloga você, e nada além
          disso. Nas páginas públicas há ainda o cookie de medição da Meta, que só
          é carregado se você aceitar.
        </p>
      </Section>

      <Section n={11} title="Mudanças nesta política">
        <p>
          Quando o texto mudar, a data no topo muda junto. Se a mudança afetar de
          forma relevante como seus dados são tratados, você é avisado por e-mail
          antes de ela valer.
        </p>
      </Section>
    </LegalPage>
  );
}
