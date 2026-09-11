import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { LEGAL, LEGAL_IS_DRAFT, pending } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Quais dados a plataforma Wealth & Wellness trata, por quê, e como pedir para apagá-los.',
  robots: LEGAL_IS_DRAFT ? { index: false, follow: false } : undefined,
};

const controller = () => pending(LEGAL.controller, 'razão social ou nome do controlador');
const taxId = () => pending(LEGAL.taxId, 'CNPJ ou CPF');
const contact = () => pending(LEGAL.contactEmail, 'e-mail de contato');

/**
 * Required before the Google OAuth app can leave Testing — and Testing is not
 * a place to stay: a test user's refresh token expires after seven days, so
 * every member would be signed out once a week with no explanation.
 *
 * Written to describe what the platform actually does, in the order someone
 * looking for one answer would scan. Anything not built yet is named as not
 * built yet rather than promised in the present tense.
 */
export default function PrivacidadePage() {
  return (
    <LegalPage eyebrow="Wealth &amp; Wellness" title="Política de Privacidade">
      <Section n={1} title="Quem trata seus dados">
        <p>
          O responsável pelo tratamento dos dados descritos aqui é {controller()},
          inscrito sob {taxId()}, a quem a LGPD (Lei 13.709/2018) chama de
          controlador. Para qualquer assunto desta política, incluindo os pedidos
          da seção 7, escreva para {contact()}.
        </p>
      </Section>

      <Section n={2} title="O que é coletado">
        <p>
          <strong className="text-[var(--text-1)]">Da sua conta Google.</strong> A
          entrada na plataforma é feita pelo Google e só por ele. Ao autorizar,
          recebemos seu nome, seu endereço de e-mail e a foto do perfil. Não
          pedimos e não recebemos sua senha, nem acesso a Gmail, Drive, Agenda,
          contatos ou qualquer outro serviço Google.
        </p>
        <p>
          <strong className="text-[var(--text-1)]">Do seu acesso.</strong> Quais
          produtos você tem direito a ver, desde quando, até quando, e se aquilo
          veio de uma compra ou de uma liberação feita à mão.
        </p>
        <p>
          <strong className="text-[var(--text-1)]">Do seu uso.</strong> Quando a
          biblioteca estiver no ar, o ponto em que você parou em cada gravação e
          quais materiais baixou, para que a plataforma continue de onde você
          deixou.
        </p>
        <p>
          <strong className="text-[var(--text-1)]">Do pagamento.</strong> As
          compras são processadas por um serviço de pagamento externo. O número
          completo do cartão nunca passa pela nossa plataforma nem é armazenado
          por nós; recebemos apenas a confirmação da compra, o endereço usado
          nela e um identificador da transação.
        </p>
        <p>
          Quando você participa do Protocol, o acompanhamento envolve dados de
          saúde, que a LGPD trata como dados sensíveis. Eles são coletados e
          usados no contexto do acompanhamento individual contratado, com o seu
          consentimento específico, e não ficam na área de membros desta
          plataforma enquanto esta política estiver nesta versão.
        </p>
      </Section>

      <Section n={3} title="Por que, e com qual base legal">
        <p>
          Identificar você e liberar o que você comprou é{' '}
          <em>execução de contrato</em> (art. 7º, V). Manter registro de compras
          e emissão fiscal é <em>obrigação legal</em> (art. 7º, II). Manter a
          plataforma de pé e protegida contra abuso é{' '}
          <em>legítimo interesse</em> (art. 7º, IX). Comunicações que não sejam
          sobre o seu acesso dependem do seu <em>consentimento</em>, que você
          pode retirar a qualquer momento.
        </p>
        <p>
          Seus dados não são vendidos, alugados nem cedidos para publicidade de
          terceiros. Nunca.
        </p>
      </Section>

      <Section n={4} title="Uso dos dados da conta Google">
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
          , incluindo os requisitos de Uso Limitado. Em termos práticos: usamos
          nome, e-mail e foto apenas para identificar você dentro da plataforma e
          ligar sua conta ao que você comprou. Não usamos esses dados para
          publicidade, não os transferimos a terceiros fora do necessário para
          operar o serviço, e não deixamos nenhuma pessoa lê-los a não ser para
          suporte que você mesmo pediu ou por exigência legal.
        </p>
      </Section>

      <Section n={5} title="Com quem os dados são compartilhados">
        <p>
          Só com quem é necessário para a plataforma funcionar, e cada um recebe
          apenas o que precisa: o <strong className="text-[var(--text-1)]">Google</strong>{' '}
          para autenticar a entrada; a{' '}
          <strong className="text-[var(--text-1)]">Supabase</strong> como banco de
          dados e autenticação, com os dados hospedados em São Paulo; o{' '}
          <strong className="text-[var(--text-1)]">processador de pagamentos</strong>{' '}
          para cobrar as assinaturas; a{' '}
          <strong className="text-[var(--text-1)]">hospedagem</strong> que serve as
          páginas; e o <strong className="text-[var(--text-1)]">YouTube</strong>,
          que hospeda as gravações e, ao tocar um vídeo, recebe dados do seu
          navegador segundo a política de privacidade do próprio Google.
        </p>
      </Section>

      <Section n={6} title="Por quanto tempo ficam guardados">
        <p>
          Os dados da sua conta ficam enquanto ela existir. Registros de compra e
          de acesso ficam pelo prazo que a legislação fiscal e civil exige, mesmo
          depois de a conta ser encerrada, porque são prova de uma relação que
          existiu. Apagada a conta, o que não estiver preso a essa obrigação é
          apagado ou anonimizado.
        </p>
      </Section>

      <Section n={7} title="Seus direitos">
        <p>
          O art. 18 da LGPD lhe dá o direito de confirmar que existe tratamento,
          acessar seus dados, corrigir o que estiver errado, pedir anonimização
          ou eliminação, pedir portabilidade, saber com quem compartilhamos, e
          retirar um consentimento que tenha dado. Nada disso cobra nada.
        </p>
        <p>
          Escreva para {contact()}. Respondemos em até 15 dias. Para apagar a
          conta inteira basta dizer isso na mensagem — não há formulário
          escondido nem etapa de retenção.
        </p>
      </Section>

      <Section n={8} title="Segurança">
        <p>
          O acesso de cada pessoa é decidido no próprio banco de dados, por
          políticas por linha: uma consulta feita por você devolve apenas o que é
          seu, e não existe uma checagem na aplicação que alguém possa esquecer
          de escrever. O tráfego é cifrado em trânsito e os dados em repouso. As
          chaves administrativas ficam fora do navegador.
        </p>
        <p>
          Nenhum sistema é imune. Se houver um incidente com risco relevante a
          você, a comunicação é feita a você e à ANPD, como manda o art. 48.
        </p>
      </Section>

      <Section n={9} title="Cookies">
        <p>
          A plataforma usa cookies para uma coisa só: manter você logado entre
          uma página e outra. Não há cookie de publicidade nem rastreamento de
          terceiros para perfilamento. Apagar esses cookies desloga você, e nada
          além disso.
        </p>
      </Section>

      <Section n={10} title="Mudanças nesta política">
        <p>
          Quando o texto mudar, a data no topo muda junto. Se a mudança afetar de
          forma relevante como seus dados são tratados, você é avisado por e-mail
          antes de ela valer.
        </p>
      </Section>
    </LegalPage>
  );
}
