import type { Metadata } from 'next';
import Image from 'next/image';
import {
  CONDICAO_RESOLVIDA,
  WHATSAPP_MESSAGE_CADASTRO,
  WHATSAPP_MESSAGE_CONVERSAR,
  condicaoRodape,
  condicaoTexto,
  protocoloCtaHref,
  proximaTurmaTexto,
  whatsappHref,
} from '@/lib/protocolo';
import { MetaPixel } from '@/components/MetaPixel';
import { ProtocoloAnalytics } from '@/components/protocolo/ProtocoloAnalytics';
import { ProtocoloStickyBuyBar } from '@/components/protocolo/StickyBuyBar';

/**
 * The W&W Protocol offer page: shown on the pitch of imersão night 2
 * (29/10) and linked from its CTA. Copy source of truth: `Página de Oferta -
 * W&W Protocol (copy v1, 23 set 2026).md`, sections S1 through S20.
 *
 * Isolated the same way `/imersao` is: it lives under `app/imersao/`, with
 * no group layout above it, so nothing but the root layout (html/body/skip
 * link) wraps it. No `SiteHeader`/`SiteFooter` — the offer's own hero is the
 * top of the page, same rule the ticket page follows.
 *
 * Public + `noindex` while the condição dates (S12/S17/S20) are unresolved:
 * see `lib/protocolo.ts`. The moment those three constants stop being
 * `null`, this page starts getting indexed with no further code change.
 *
 * Left out of this build, and why:
 * - **Hero video** (S1, `[OPCIONAL, Kauã tem?]`): none exists yet. The copy
 *   doc itself says to fall back to a photo when there is no video, so the
 *   hero uses `kaua-portrait-seated.jpg` (same file `/imersao` already
 *   publishes) instead of a `<video>` element.
 * - **S3 depoimentos exactly as scoped in the copy** (`g01`, `g03`, `g02`
 *   from "Depoimentos Grupos", `04` and `01` from "Depoimentos Instagram"):
 *   none of those five have a written authorization on file yet (copy doc,
 *   pendência 3). This page reuses 7 of the 8 prints already published (the body
 *   before/after one stays out, as the doc asks) and
 *   authorized on `/imersao` instead (`/photos/depoimentos/01…08`), which
 *   covers the same idea (real, anonymized student messages) without
 *   publishing anything new.
 * - **S2/S8 Weekly Report + platform screenshots**: real reports await
 *   authorization, and the demo-account/App NIVA screenshots don't exist
 *   yet (copy doc, pendências 4-5). Both sections ship as text only, which
 *   the copy still reads fine without an image.
 * - **S15 W&W Connect**: copy doc marks it `[OPCIONAL, Kauã decide]` with no
 *   decision on file. Left out entirely rather than guessed at.
 */
const CTA_CLASS =
  'inline-flex w-full items-center justify-center rounded-full bg-[#C9A84C] px-8 py-[18px] ' +
  'text-[1.0625rem] font-semibold text-[#0D0D0D] transition-colors duration-300 hover:bg-[#D4B85C] sm:w-auto';

/** Same buttons, narrower padding and a 16px label on phones: used inside the
 *  padded plan/offer cards, where the full-size label would wrap onto two
 *  lines at 390px (and did, on desktop too, with two buttons side by side). */
const CTA_IN_CARD_CLASS =
  'inline-flex w-full items-center justify-center rounded-full bg-[#C9A84C] px-6 py-[18px] text-center ' +
  'text-[1rem] font-semibold text-[#0D0D0D] transition-colors duration-300 hover:bg-[#D4B85C] sm:w-auto sm:px-8 sm:text-[1.0625rem]';

const CTA_OUTLINE_IN_CARD_CLASS =
  'inline-flex w-full items-center justify-center rounded-full border border-[var(--border-hover)] px-6 py-[18px] text-center ' +
  'text-[1rem] font-semibold text-[var(--text-1)] transition-colors duration-300 hover:border-[var(--accent)] sm:w-auto sm:px-8 sm:text-[1.0625rem]';

const H2 = 'font-display text-[1.75rem] md:text-[2.25rem] leading-[1.1] tracking-[-0.02em]';
const H2_DARK = `${H2} text-[var(--text-1)]`;
const H2_LIGHT = `${H2} text-[#0D0D0D]`;

const BODY_LIGHT = 'text-[1.09375rem] md:text-[1.1875rem] leading-[1.6] text-[#2a2a2a]';
const BODY_DARK = 'text-[1.09375rem] md:text-[1.1875rem] leading-[1.6] text-[rgba(244,242,238,0.78)]';

const KICKER_GOLD = 'text-[0.875rem] uppercase tracking-[0.1em] text-[var(--accent)]';
const HERO_EYEBROW =
  'font-[family-name:var(--font-label)] text-[0.8125rem] uppercase tracking-[0.15em] text-[var(--accent)] text-balance';

/**
 * 7 of the 8 prints `/imersao` already publishes with the student's OK
 * (23/09/2026). Duplicated here rather than imported so `/imersao` stays
 * untouched by this page's build: see the file-level note above for why
 * these 7 stand in for the copy doc's own (unauthorized) S3 picks.
 */
const DEPOIMENTOS = [
  {
    src: '/photos/depoimentos/01-whoop-age.jpg',
    w: 630,
    h: 1270,
    alt: 'Print do Whoop de uma aluna: idade biológica 52,8, e a mensagem dela contando que estava em 62 quando começou',
    label: 'Aluna · Whoop',
    quote: 'Tava 62 qdo começamos.',
    detail: 'Whoop Age hoje: 52,8. O motivo que o próprio app escreveu: regularidade do sono.',
  },
  {
    src: '/photos/depoimentos/02-melhor-shape.jpg',
    w: 498,
    h: 746,
    alt: 'Mensagem de aluna: o melhor shape da vida depois dos 30, corpo leve e agradecimento pelo processo',
    label: 'Aluna',
    quote: 'O melhor “shape” da minha vida, pós “30\'s”!!',
    detail: undefined,
  },
  {
    src: '/photos/depoimentos/04-correr-5k.jpg',
    w: 580,
    h: 666,
    alt: 'Mensagem de aluna: correu 5 km sem parar pela primeira vez',
    label: 'Aluna',
    quote: 'Correr já é uma conquista, pois nunca consegui fazer isso antes.',
    detail: undefined,
  },
  {
    src: '/photos/depoimentos/05-macarrao.jpg',
    w: 720,
    h: 319,
    alt: 'Mensagem de aluna: emagreci comendo macarrão, tô chocada',
    label: 'Aluna',
    quote: 'Gente, emagreci comendo macarrão. Tô chocada.',
    detail: undefined,
  },
  {
    src: '/photos/depoimentos/06-figado.jpg',
    w: 557,
    h: 718,
    alt: 'Mensagem de aluno: mais uma conquista, zero gordura no fígado',
    label: 'Aluno',
    quote: 'Mais uma conquista: 0 gordura no fígado.',
    detail: undefined,
  },
  {
    src: '/photos/depoimentos/07-calca-42.jpg',
    w: 532,
    h: 680,
    alt: 'Mensagem de aluna: entrando numa calça 42, como estou feliz',
    label: 'Aluna',
    quote: 'Entrando em uma calça 42 em 3… 2… 1…',
    detail: undefined,
  },
  {
    src: '/photos/depoimentos/08-bem-dividido.jpg',
    w: 720,
    h: 198,
    alt: 'Mensagem de aluno: o programa tá sendo muito legal, bem dividido, bom de executar',
    label: 'Aluno',
    quote: 'O programa tá sendo muito legal… Bem dividido, tá sendo bom de executar.',
    detail: undefined,
  },
] as const;

const TITLE = 'W&W Protocol · acompanhamento individual, 90 ou 180 dias';
const DESCRIPTION =
  'Acompanhamento individual comigo, Kauã Ramos, por 90 ou 180 dias. Doze semanas em três ciclos, um relatório por semana e uma call a cada quinze dias, até você ler os seus números sozinho.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  // Enquanto o prazo da condição, a semana do onboarding e a data da próxima
  // turma (lib/protocolo.ts) não forem preenchidos, esta página não tem uma
  // condição real pra mostrar, então não deve ser indexada. Mesma regra que
  // `/imersao` aplicava ao checkout nulo.
  ...(CONDICAO_RESOLVIDA ? {} : { robots: { index: false, follow: false } }),
};

function Check({ tone = 'gold' }: { tone?: 'gold' | 'goldLight' | 'muted' }) {
  const style =
    tone === 'goldLight'
      ? 'border-[#8C7440] text-[#8C7440]'
      : tone === 'muted'
        ? 'border-[rgba(244,242,238,0.5)] text-[rgba(244,242,238,0.5)]'
        : 'border-[var(--accent)] text-[var(--accent)]';

  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border text-center text-[10px] leading-[14px] ${style}`}
    >
      {tone === 'muted' ? '✕' : '✓'}
    </span>
  );
}

const ENTREGAVEIS = [
  { title: 'Onboarding', body: '1 call de 1h15 com anamnese conduzida' },
  { title: 'Linha de base', body: '10 dias de diagnóstico, 6 números fixos' },
  { title: 'Plano do Ciclo', body: '1 por ciclo: 3 planos na trilha' },
  { title: 'Weekly Report', body: '1 por semana, todas as semanas' },
  { title: 'Calls comigo', body: '45 min a cada 15 dias: 6 no programa de 90 dias, 12 no de 180' },
  { title: 'Leitura diária', body: 'os seus indicadores lidos todos os dias' },
  { title: 'Chat de suporte', body: 'dias úteis, resposta em até 1 dia útil' },
  { title: 'App NIVA', body: 'incluso, assinatura paga por mim durante o programa' },
  { title: 'Painel de exames', body: 'pedido no começo, primeira leitura na semana 3, reteste lido na semana 11' },
  {
    title: '5 guias do método',
    body: 'O Mínimo Inegociável · Fim do Crash das 15h · Cardápio Sem Culpa · Doce Sem Sabotagem · O Mundo é a Academia',
  },
  { title: 'Balanço do Arco', body: 'o documento de fechamento do seu programa' },
];

const FAQ = [
  {
    q: 'Quanto tempo dura o acompanhamento?',
    a: '90 ou 180 dias. Nos dois, a Trilha Mestre W&W tem 12 semanas em três ciclos de quatro: Fundamento, Construção e Autonomia. No de 180 dias, depois da trilha vêm mais três ciclos em modo de manutenção, com os mesmos relatórios semanais e calls.',
  },
  {
    q: 'Como são as calls?',
    a: 'Por vídeo, comigo, com 45 minutos cada, a cada quinze dias. São 6 no programa de 90 dias e 12 no de 180, todas agendadas de uma vez no Day Zero. Antes delas vem o onboarding, de 1h15, com a anamnese. A primeira call quinzenal é o Kick-Off, no dia 11, quando você recebe o Plano do Ciclo 1.',
  },
  {
    q: 'Preciso de qual wearable?',
    a: 'Qualquer relógio ou anel que conecte com o Apple Health (iPhone) ou o Samsung Health (Android). O aparelho com que eu tenho mais familiaridade é o Whoop. Usar um wearable compatível é condição do contrato, porque todo o acompanhamento é feito em cima do seu dado. O aparelho não está incluso. O app NIVA está, com a assinatura paga por mim durante o programa.',
  },
  {
    q: 'E se eu viajar muito?',
    a: 'A anamnese tem um bloco inteiro sobre a sua rotina real, com as viagens, e o plano é montado em cima da sua agenda. O Protocolo das Exceções que você recebeu na imersão (jantar que acaba tarde, voo cedo, sábado) continua valendo. As calls são online, e o seu aparelho sincroniza de onde você estiver, então a leitura diária continua. Se precisar remarcar uma call, avise com 24 horas de antecedência. Falta sem aviso consome a sessão.',
  },
  {
    q: 'Como funciona a garantia?',
    a: 'São duas. Os 7 dias de arrependimento, conforme a lei, mais a minha garantia de 30 dias com condições, escrita no contrato: nos primeiros 30 dias, se você vier às calls, configurar o app e seguir o protocolo, e ainda assim não tiver clareza e autonomia sobre os seus próprios dados, eu devolvo o valor do primeiro mês ou estendo o suporte, à sua escolha. Depois dos 30 dias, o cancelamento é proporcional ao que foi prestado, com aviso prévio de 7 dias.',
  },
  {
    q: 'Como eu pago?',
    a: 'Pelo checkout do link, no Pix ou no cartão. No cartão, em até 3x no programa de 90 dias e em até 6x no de 180. O contrato chega em até 24 horas depois do pagamento.',
  },
  {
    q: 'Como funciona depois que eu fecho?',
    a: 'São três passos. Primeiro, o pagamento, e o contrato chega em até 24 horas. Depois, você fala comigo no WhatsApp profissional, faz o seu cadastro e agenda o seu onboarding. Por fim, eu ou o time W&W abrimos o seu grupo de acompanhamento, que é individual: só você e o time W&W. É nele que você manda o contexto da semana e tira dúvidas em dia útil, com resposta em até 1 dia útil.',
  },
  {
    q: 'Eu já tenho médico. Isso substitui o acompanhamento dele?',
    a: 'Não substitui. O W&W Protocol tem caráter educacional e de acompanhamento: não é consulta médica, diagnóstico nem prescrição. Eu também não substituo a sua nutricionista nem o seu treinador. Eu faço o que você já contratou funcionar junto, e todo Plano do Ciclo tem uma seção com o que levar à sua próxima consulta.',
  },
  {
    q: '90 ou 180 dias: qual escolher?',
    a: 'Eu recomendo o de 180. Nos 90 dias a trilha roda uma vez e termina. Nos 180, você ganha mais três ciclos de manutenção, que é quando a rotina real (férias, fim de ano, viagem longa) testa o que você construiu. Se preferir começar pelo de 90, fale comigo no WhatsApp profissional sobre a migração pro de 180 antes do fim do programa.',
  },
];

export default function ProtocoloPage() {
  const cta180 = protocoloCtaHref('180d');
  const cta90 = protocoloCtaHref('90d');
  const ctaWhatsConversar = whatsappHref(WHATSAPP_MESSAGE_CONVERSAR);
  const ctaWhatsCadastro = whatsappHref(WHATSAPP_MESSAGE_CADASTRO);

  return (
    <div className="pb-20 md:pb-0">
      {/* S1 · HERO (dark) */}
      <section className="bg-[var(--bg)] pt-10 pb-20 md:pt-24 md:pb-28">
        <div className="container-lp grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr] md:gap-16">
          <div>
            <p className={HERO_EYEBROW}>W&W PROTOCOL · para quem esteve na Imersão Performance e Longevidade</p>
            <h1 className="page-title mt-4 text-[2rem] leading-[1.08] md:text-[2.75rem] lg:text-[3.25rem]">
              Alguém lendo o seu wearable toda semana, contra a sua própria linha de base, e dizendo o
              que fazer na segunda de manhã.
            </h1>
            <p className={`mt-6 max-w-[560px] ${BODY_DARK}`}>
              Acompanhamento individual comigo, Kauã Ramos, por 90 ou 180 dias. Doze semanas em três
              ciclos, um relatório por semana e uma call a cada quinze dias, até você ler os seus
              números sozinho.
            </p>
            <a
              href={cta180}
              data-cta="hero"
              data-plan="180d"
              target="_blank"
              rel="noopener noreferrer"
              className={`${CTA_CLASS} mt-8`}
            >
              QUERO O PROTOCOL DE 180 DIAS
            </a>
            <div>
              <a
                href={cta90}
                data-cta="hero-90"
                data-plan="90d"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-[0.9375rem] text-[rgba(244,242,238,0.78)] underline underline-offset-4 hover:text-[#F4F2EE]"
              >
                Prefiro começar pelo de 90 dias
              </a>
            </div>

            <ul className={`mt-10 space-y-4 border-t border-[var(--border)] pt-8 ${BODY_DARK}`}>
              <li className="flex gap-3">
                <Check />
                <span>
                  <strong className="text-[var(--text-1)]">Individual, comigo.</strong> Calls, relatório
                  e plano só seus.
                </span>
              </li>
              <li className="flex gap-3">
                <Check />
                <span>
                  <strong className="text-[var(--text-1)]">Um relatório por semana.</strong> Todas as
                  semanas do programa.
                </span>
              </li>
              <li className="flex gap-3">
                <Check />
                <span>
                  <strong className="text-[var(--text-1)]">7 dias de arrependimento + garantia de 30 dias.</strong>{' '}
                  A de 30 dias com condições, no contrato.
                </span>
              </li>
            </ul>
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden border border-[var(--border)] md:aspect-[3/4]">
            <Image
              src="/photos/kaua-portrait-seated.jpg"
              alt="Kauã Ramos, health manager da Wealth & Wellness"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              quality={75}
              className="object-cover"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg)]/40 via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* S2 · ONDE TUDO ACONTECE (light) */}
      <section id="onde" className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp grid gap-8 md:grid-cols-[280px_1fr] md:gap-16">
          <h2 className={H2_LIGHT}>O seu dado lido toda semana, num lugar só</h2>
          <div className={`max-w-[680px] space-y-6 ${BODY_LIGHT}`}>
            <p>
              Toda semana você recebe o seu Weekly Report: os seus números contra a sua própria média, e
              embaixo a leitura da semana escrita em português, com o que fazer na segunda de manhã.
              Quando a história que você me conta e o que o aparelho mostra não batem, quem decide é o
              dado.
            </p>
            <p>
              Repare no que o relatório deixa de fora: a nota de prontidão. Ficam os números crus (a
              regularidade do seu sono, o seu HRV, a sua frequência cardíaca de repouso) e alguém que
              cruza esses números com a sua agenda.
            </p>
            <p>
              Tudo que eu te entrego fica na sua área, em quatro prateleiras: o Plano do Ciclo, os Weekly
              Reports, os materiais e o contrato. E o app NIVA vem incluso, com a assinatura paga por mim
              durante todo o programa.
            </p>
            <p className="font-display text-[1.25rem] italic text-[#0D0D0D]">
              O aparelho mede. Ninguém lê. Aqui alguém lê.
            </p>
          </div>
        </div>
      </section>

      {/* S3 · O QUE OS ALUNOS ESCREVEM NO ACOMPANHAMENTO (light, continua) */}
      <section
        id="depoimentos"
        aria-labelledby="depoimentos-titulo"
        className="border-t border-[rgba(13,13,13,0.08)] bg-[#F4F2EE] pb-20 pt-16 md:pb-28 md:pt-20"
      >
        <div className="container-lp">
          <p className="text-[0.875rem] uppercase tracking-[0.1em] text-[#8C7440]">Alunos W&W</p>
          <h2 id="depoimentos-titulo" className={`${H2_LIGHT} mt-3`}>
            O que os alunos escrevem no acompanhamento
          </h2>
          <p className={`mt-4 max-w-[680px] ${BODY_LIGHT}`}>
            Prints do acompanhamento individual de cada aluno, sem nome, com autorização de cada um.
          </p>
        </div>
        <div className="md:mx-auto md:max-w-[1440px] md:px-10 lg:px-16">
          <ul
            className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] md:flex-wrap md:items-start md:justify-center md:gap-6 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Prints de mensagens de alunos"
          >
            {DEPOIMENTOS.map((d) => (
              <li
                key={d.src}
                className="w-[82vw] max-w-[340px] shrink-0 snap-center rounded-[14px] border border-[rgba(13,13,13,0.08)] bg-[#FCFBF8] p-5 shadow-[0_8px_24px_rgba(13,13,13,0.06)] md:w-[calc(50%-12px)] md:max-w-none lg:w-[calc(25%-18px)]"
              >
                <p className="text-[0.8125rem] uppercase tracking-[0.08em] text-[#8C7440]">{d.label}</p>
                <blockquote className="mt-3 font-display text-[1.125rem] leading-[1.35] text-[#0D0D0D] md:text-[1.375rem]">
                  “{d.quote}”
                </blockquote>
                {d.detail ? (
                  <p className="mt-2 text-[0.9375rem] leading-[1.5] text-[#2a2a2a]">{d.detail}</p>
                ) : null}
                <a
                  href={d.src}
                  target="_blank"
                  rel="noopener"
                  aria-label="Ver print em tamanho real"
                  className="mt-4 flex min-h-[44px] items-center justify-center rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
                >
                  <Image
                    src={d.src}
                    alt={d.alt}
                    width={d.w}
                    height={d.h}
                    sizes="260px"
                    quality={85}
                    className="h-auto w-auto max-h-[340px] max-w-[260px] rounded-[10px] border border-[rgba(13,13,13,0.12)] object-contain"
                  />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 px-6 text-[0.8125rem] text-[rgba(13,13,13,0.45)] md:hidden">
            Arraste para ver mais →
          </p>
          <p className="mt-6 px-6 max-w-[680px] text-[0.8125rem] leading-[1.5] text-[rgba(13,13,13,0.5)] md:px-0">
            Resultados individuais, de pessoas diferentes, com rotinas diferentes. Cada caso começa pela
            anamnese e pela linha de base da própria pessoa.
          </p>
        </div>
      </section>

      {/* S4 · COMO FUNCIONA (dark) */}
      <section id="como-funciona" className="bg-[var(--bg-elevated)] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_DARK}>Como funciona o W&W Protocol</h2>
          <p className={`mt-4 max-w-[680px] ${BODY_DARK}`}>
            Uma jornada com começo, meio e graduação. Nenhuma estratégia é escolhida antes de eu entender
            a sua história.
          </p>

          <ol className="mt-12 space-y-8">
            {[
              {
                n: '01',
                t: 'DAY ZERO',
                b: 'Contrato assinado, cadastro feito comigo no WhatsApp profissional, o seu grupo individual de acompanhamento aberto (só você e o time W&W), app configurado, pedido de exames e todas as calls do programa já na sua agenda. Fica pronto até 48 horas antes do onboarding.',
              },
              {
                n: '02',
                t: 'ONBOARDING COM ANAMNESE',
                b: 'Uma call de 1h15 comigo. O bloco central são 30 minutos sobre a sua história: metabolismo, medicação e suplementação, lesões, alimentação, o que você já tentou e a sua rotina real, com as viagens.',
              },
              {
                n: '03',
                t: 'DIAGNÓSTICO · DIAS 1 A 10',
                b: 'Dez dias em que eu observo e não prescrevo nada. Eles geram a sua linha de base: seis números que nunca mais são editados. É contra eles que tudo depois é medido, a mesma lógica que você viu na imersão com o HRV.',
              },
              {
                n: '04',
                t: 'KICK-OFF · DIA 11',
                b: 'Você recebe o Plano do Ciclo 1: linha de base, três metas-âncora, treino, nutrição, sono e recuperação, o que levar ao seu médico, como vamos medir e o calendário.',
              },
              {
                n: '05',
                t: 'TRÊS CICLOS DE QUATRO SEMANAS',
                b: 'Ciclo 1 · Fundamento. Ciclo 2 · Construção. Ciclo 3 · Autonomia. Um Weekly Report por semana, uma call de 45 minutos a cada quinze dias e um Plano do Ciclo novo no começo de cada ciclo.',
              },
              {
                n: '06',
                t: 'GRADUAÇÃO E BALANÇO DO ARCO',
                b: 'Na semana 12 você lê os seus números sozinho. No fechamento, o Balanço do Arco mostra de onde você saiu, onde chegou e o que o próximo ciclo destrava.',
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-6 border-b border-[var(--border)] pb-8 last:border-0">
                <span aria-hidden="true" className="font-display shrink-0 text-[1.5rem] text-[var(--accent)]">
                  {step.n}
                </span>
                <div>
                  <p className={KICKER_GOLD}>{step.t}</p>
                  <p className={`mt-2 max-w-[760px] ${BODY_DARK}`}>{step.b}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 border border-[var(--border-hover)] bg-[var(--bg-card)] p-8">
            <p className={KICKER_GOLD}>FAIXA EXTRA · SÓ NO 180 DIAS</p>
            <p className={`mt-3 ${BODY_DARK}`}>
              Ciclos 4 a 6 · manutenção. A trilha inteira roda uma vez e você ganha mais três ciclos
              comigo olhando, quando a rotina real testa o que você construiu.
            </p>
          </div>

          <h3 className={`${H2_DARK} mt-16 text-[1.5rem] md:text-[1.75rem]`}>O que você recebe</h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ENTREGAVEIS.map((item) => (
              <div key={item.title} className="border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <p className="card-title">{item.title}</p>
                <p className={`mt-2 ${BODY_DARK}`}>{item.body}</p>
              </div>
            ))}
          </div>

          <h3 className={`${H2_DARK} mt-16 text-[1.5rem] md:text-[1.75rem]`}>90 ou 180 dias</h3>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="border border-[var(--accent)] bg-[var(--bg-card)] p-6 md:p-8">
              <p className={KICKER_GOLD}>180 dias · recomendado</p>
              <ul className={`mt-5 space-y-3 ${BODY_DARK}`}>
                <li>Trilha de 12 semanas: inteira</li>
                <li>Calls de 45 min: 12</li>
                <li>Weekly Report: 26 semanas</li>
                <li>Ciclos 4 a 6 em manutenção: sim</li>
                <li>Parcelamento: até 6x</li>
              </ul>
              <a
                href={cta180}
                data-cta="como-funciona-180"
                data-plan="180d"
                target="_blank"
                rel="noopener noreferrer"
                className={`${CTA_IN_CARD_CLASS} mt-6`}
              >
                QUERO O PROTOCOL DE 180 DIAS
              </a>
            </div>
            <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8">
              <p className={KICKER_GOLD}>90 dias</p>
              <ul className={`mt-5 space-y-3 ${BODY_DARK}`}>
                <li>Trilha de 12 semanas: inteira</li>
                <li>Calls de 45 min: 6</li>
                <li>Weekly Report: 13 semanas</li>
                <li>Ciclos 4 a 6 em manutenção: não</li>
                <li>Parcelamento: até 3x</li>
              </ul>
              <a
                href={cta90}
                data-cta="como-funciona-90"
                data-plan="90d"
                target="_blank"
                rel="noopener noreferrer"
                className={`${CTA_OUTLINE_IN_CARD_CLASS} mt-6`}
              >
                QUERO O PROTOCOL DE 90 DIAS
              </a>
            </div>
          </div>
          <p className={`mt-6 max-w-[680px] ${BODY_DARK}`}>
            Nos 90 dias a trilha roda uma vez e termina. Nos 180, ela roda inteira e eu continuo olhando
            nos três ciclos seguintes, que é quando a maioria das pessoas perde o que ganhou.
          </p>
        </div>
      </section>

      {/* S5 · O QUE MUDA NA SUA SEMANA (light) */}
      <section id="beneficios" className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_LIGHT}>O que muda na sua semana</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                t: 'Decisão em um dia, em vez de trinta',
                b: 'Num acompanhamento tradicional o intervalo entre o dado e a decisão é de um mês. Aqui eu leio os seus indicadores todo dia.',
              },
              {
                t: 'A régua é você',
                b: 'O seu HRV e a sua frequência de repouso comparados à sua linha de base, e não à média de um fabricante.',
              },
              {
                t: 'Um plano que cabe na agenda',
                b: 'Jantar que acaba tarde, voo às 6h e sábado já entram no plano desde a anamnese.',
              },
              {
                t: 'Dois minutos por manhã',
                b: 'O que eu peço de você: olhar três números, vir na call a cada quinze dias e contar no seu grupo individual o que aconteceu na semana.',
              },
              {
                t: 'Dado organizado pro seu médico',
                b: 'Todo Plano do Ciclo tem uma seção com o que levar à consulta.',
              },
              {
                t: 'Autonomia no fim',
                b: 'Na semana 12 você lê os seus próprios números e sabe o que fazer com eles.',
              },
            ].map((item) => (
              <div key={item.t} className="border border-[rgba(13,13,13,0.12)] bg-[#FCFBF8] p-6">
                <p className={`${BODY_LIGHT} text-[#0D0D0D]`}>
                  <strong className="font-medium">{item.t}.</strong> {item.b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* S6 · O JEITO COMUM (dark, cards ✕) */}
      <section id="jeito-comum" className="bg-[var(--bg-elevated)] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_DARK}>O jeito comum de cuidar dos seus números</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                t: 'Seguir a nota da manhã',
                b: 'Um número composto decide o seu dia, e cada fabricante tem a sua receita. Ninguém provou que o score de prontidão mede o que promete, e quem usa o aparelho por 10 a 12 meses tende a achar que melhorou sem ter melhorado.',
              },
              {
                t: 'Consertar ontem',
                b: 'A nota veio baixa, então você dorme mais cedo na quarta e fica na cama até as 9h no sábado. Cada horário diferente é um pequeno fuso que você mesmo provoca, e a nota da semana seguinte vem pior.',
              },
              {
                t: 'Cada profissional olhando uma parte',
                b: 'O treinador vê o treino. A nutricionista vê a dieta. O check-up anual vem normal. O relógio registra tudo, e ninguém cruza as três informações com a sua agenda.',
              },
            ].map((item) => (
              <div key={item.t} className="border border-[var(--border)] bg-[var(--bg-card)] p-8">
                <div className="flex gap-3">
                  <Check tone="muted" />
                  <p className="card-title">{item.t}</p>
                </div>
                <p className={`mt-4 ${BODY_DARK}`}>{item.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* S7 · O JEITO W&W (light, pilares ✓) */}
      <section id="jeito-ww" className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_LIGHT}>O jeito W&W · Trilha Mestre W&W</h2>
          <div className="mt-10 space-y-6">
            {[
              {
                t: 'A Hora Fixa como base',
                b: 'Você começou na imersão: uma hora pra acordar, sete dias por semana, janela de 30 minutos. É o primeiro ajuste porque é subtração. Você para de variar o horário antes de acrescentar qualquer treino.',
              },
              {
                t: 'Linha de base antes de qualquer plano',
                b: 'Dez dias em que eu observo e não prescrevo. Saem seis números que nunca são editados. Toda decisão depois disso é comparada com eles, e com a média de mais ninguém.',
              },
              {
                t: 'Anamnese antes de qualquer estratégia',
                b: 'Meia hora sobre a sua história, a sua medicação, as suas lesões e a sua rotina real. Nenhuma estratégia é escolhida antes disso, em nenhum ciclo.',
              },
              {
                t: 'Leitura humana, toda semana, com contexto',
                b: 'O seu HRV caiu na quinta. Foi o voo, o treino de quarta ou o começo de uma gripe: o número é o mesmo e a decisão certa é oposta em cada caso. No Weekly Report eu cruzo o número com a sua semana e escrevo o que fazer.',
              },
              {
                t: 'Só o que você consegue repetir sozinho',
                b: 'Nenhuma semana usa uma estratégia que você não consiga manter no mês seguinte. Por isso ficaram de fora, de propósito, jejum prolongado e corte de água. A trilha termina com você conduzindo o seu próprio protocolo.',
              },
            ].map((item) => (
              <div key={item.t} className="flex gap-4 border border-[rgba(13,13,13,0.12)] bg-[#FCFBF8] p-6">
                <Check tone="goldLight" />
                <div>
                  <p className={`${BODY_LIGHT} text-[#0D0D0D] font-medium`}>{item.t}</p>
                  <p className={`mt-2 max-w-[760px] ${BODY_LIGHT}`}>{item.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* S8 · ENTENDA POR QUE FUNCIONA (dark, texto só: sem o mockup do Weekly Report, ainda sem autorização) */}
      <section id="por-que-funciona" className="bg-[var(--bg-elevated)] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_DARK}>Entenda por que funciona</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              'Quando a hora de acordar para de mudar, você deixa de provocar um pequeno fuso a cada dia da semana.',
              'O HRV e a frequência cardíaca de repouso são medidos direto pelo sensor, e respondem em dias quando o horário estabiliza. Você acompanha no gráfico do seu próprio aparelho.',
              'Comparados à sua linha de base, esses números mostram o que mudou na sua semana, em vez de um veredito sobre a noite de ontem.',
              'Com alguém cruzando o número e o contexto (o jantar, o voo, o treino), a oscilação vira uma decisão pra segunda de manhã, e você para de voltar à nota em três semanas.',
            ].map((text, i) => (
              <li key={text} className="flex gap-4 border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <span aria-hidden="true" className="font-display shrink-0 text-[1.75rem] text-[var(--accent)]">
                  {i + 1}
                </span>
                <p className={BODY_DARK}>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* S9 + S10 · O CICLO DA NOTA / O CICLO DA HORA (light, duas colunas) */}
      <section id="ciclos" className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp grid gap-6 md:grid-cols-2 md:items-start">
          <div className="border border-[rgba(13,13,13,0.12)] bg-[#FCFBF8] p-8">
            <h2 className={`${H2_LIGHT} text-[1.5rem] md:text-[1.75rem]`}>O ciclo da nota</h2>
            <ol className={`mt-6 space-y-4 ${BODY_LIGHT}`}>
              <li>
                <strong className="font-medium text-[#0D0D0D]">1 · A nota veio baixa.</strong> Você
                acorda, abre o app e o seu dia começa com um veredito.
              </li>
              <li>
                <strong className="font-medium text-[#0D0D0D]">2 · Você tenta consertar ontem.</strong>{' '}
                Dorme mais cedo num dia, fica na cama até mais tarde no outro.
              </li>
              <li>
                <strong className="font-medium text-[#0D0D0D]">3 · O horário bagunça.</strong> Terça às
                6h, quinta às 7h30, sábado às 9h. O relógio do corpo não sabe mais que horas são.
              </li>
              <li>
                <strong className="font-medium text-[#0D0D0D]">4 · A nota vem pior.</strong> E você volta
                ao passo 1, com a sensação de que está cuidando de si.
              </li>
            </ol>
          </div>
          <div className="border border-[#8C7440] bg-[#FCFBF8] p-8">
            <h2 className={`${H2_LIGHT} text-[1.5rem] md:text-[1.75rem]`}>O ciclo da hora</h2>
            <ol className={`mt-6 space-y-4 ${BODY_LIGHT}`}>
              <li>
                <strong className="font-medium text-[#0D0D0D]">1 · Uma hora fixa.</strong> A mesma hora
                pra acordar, sete dias por semana, com janela de 30 minutos.
              </li>
              <li>
                <strong className="font-medium text-[#0D0D0D]">2 · Os números estabilizam.</strong> HRV e
                frequência de repouso param de oscilar por causa do horário.
              </li>
              <li>
                <strong className="font-medium text-[#0D0D0D]">3 · Linha de base limpa.</strong> O que
                muda passa a ter causa visível: o jantar, o voo, o treino.
              </li>
              <li>
                <strong className="font-medium text-[#0D0D0D]">4 · Leitura com contexto.</strong> Toda
                semana eu cruzo os seus números com a sua agenda e escrevo o que fazer.
              </li>
              <li>
                <strong className="font-medium text-[#0D0D0D]">5 · Decisão certa na segunda.</strong> Você
                treina, ajusta ou recua pelo seu dado, e na semana 12 faz essa leitura sozinho.
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* S11 · CALLOUT (dark) */}
      <section id="callout" className="bg-[var(--bg)] py-16 md:py-20">
        <div className="container-lp">
          <div className="mx-auto max-w-[680px] border border-[var(--accent)] bg-[var(--accent-glow)] p-8 text-center">
            <p aria-hidden="true" className="text-[1.5rem] text-[var(--accent)]">
              ▲
            </p>
            <h2 className={`${H2_DARK} mt-3 text-[1.5rem] md:text-[1.75rem]`}>Você tem a opção de mudar</h2>
            <p className={`mt-4 ${BODY_DARK}`}>
              Sempre que o número da manhã subir e descer sem explicação, lembre: a leitura pode ser
              feita por alguém que conhece a sua linha de base e a sua semana. Você já tem o aparelho no
              pulso. O que falta é a leitura.
            </p>
          </div>
        </div>
      </section>

      {/* S12 · CONDIÇÃO DE QUEM ESTEVE NAS DUAS NOITES (light) */}
      <section id="condicao" className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp text-center">
          <div className="mx-auto max-w-[680px]">
            <h2 className={H2_LIGHT}>A condição de quem esteve nas duas noites</h2>
            <p className={`mt-6 ${BODY_LIGHT}`}>{condicaoTexto()}</p>
            <p className="mt-4 text-[0.9375rem] text-[rgba(13,13,13,0.55)]">{condicaoRodape()}</p>
            <a
              href={cta180}
              data-cta="condicao"
              data-plan="180d"
              target="_blank"
              rel="noopener noreferrer"
              className={`${CTA_CLASS} mt-8`}
            >
              QUERO O PROTOCOL DE 180 DIAS
            </a>
          </div>
        </div>
      </section>

      {/* S13 · O ESTUDO POR TRÁS DA HORA FIXA (dark) */}
      <section id="estudo" className="bg-[var(--bg-elevated)] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_DARK}>A regularidade pesou mais que as horas dormidas</h2>
          <p className={`mt-4 max-w-[680px] ${BODY_DARK}`}>
            Um estudo publicado na revista Sleep em janeiro de 2024 acompanhou 60.977 pessoas do UK
            Biobank, com cerca de 10 milhões de horas de acelerômetro no pulso. Os pesquisadores
            compararam a regularidade do sono com a quantidade de horas dormidas.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
              <p className="stat-num">30% menos</p>
              <p className={`mt-2 ${BODY_DARK}`}>mortalidade por todas as causas no grupo com o sono mais regular (o quintil mais regular).</p>
            </div>
            <div className="border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
              <p className="stat-num">38% menos</p>
              <p className={`mt-2 ${BODY_DARK}`}>mortalidade cardiometabólica no mesmo grupo.</p>
            </div>
            <div className="border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
              <p className="stat-num">Regularidade &gt; duração</p>
              <p className={`mt-2 ${BODY_DARK}`}>a regularidade previu o risco melhor que a duração do sono.</p>
            </div>
          </div>
          <p className={`mt-10 max-w-[680px] ${BODY_DARK}`}>
            É por isso que a Hora Fixa vem primeiro, e é por isso que a regularidade é a primeira linha
            do seu Weekly Report.
          </p>
          <p className="mt-6 max-w-[680px] text-[0.8125rem] leading-[1.5] text-[rgba(244,242,238,0.5)]">
            Sleep, jan/2024, UK Biobank. Estudo populacional sobre regularidade do sono, sem relação com
            o W&W Protocol. Não é resultado de alunos.
          </p>
        </div>
      </section>

      {/* S14 · QUEM VAI TE ACOMPANHAR (light) */}
      <section id="autoridade" className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp grid items-start gap-10 md:grid-cols-[280px_1fr] md:gap-16">
          <div>
            <h2 className={`${H2_LIGHT} text-[1.5rem] md:text-[1.75rem]`}>
              Kauã Ramos · Health Manager · Longevidade & Performance
            </h2>
            <div className="relative mt-6 aspect-[3/4] w-full overflow-hidden">
              <Image
                src="/photos/kaua-portrait-close.jpg"
                alt="Kauã Ramos, health manager da Wealth & Wellness"
                fill
                sizes="(max-width: 768px) 100vw, 280px"
                quality={75}
                className="object-cover"
                loading="eager"
              />
            </div>
            <p className="mt-3 text-[0.8125rem] text-[rgba(13,13,13,0.5)]">
              O W&W Protocol foi criado por Kauã Ramos.
            </p>
          </div>
          <div className={`max-w-[680px] space-y-5 ${BODY_LIGHT}`}>
            <p>
              Eu cuido da saúde, da performance e da longevidade de quem não tem tempo pra cuidar delas.
              Comecei aos 14 anos, acima do peso, treinando com o meu pai, e a primeira coisa que aprendi
              foi sobre repetir: o que mudou o meu corpo foi a regularidade.
            </p>
            <p>
              Aos 17 conheci o CrossFit e virei coach de CrossFit Level 1. Por volta de 2020 e 2021 passei
              a acompanhar empresários de 45, 50 anos ou mais num hub internacional de wellness: agenda
              cheia, viagem, jantar de negócios e um relógio caro no pulso. Quase todos tinham o dado e
              ninguém lendo. Já são centenas de clientes com esse perfil.
            </p>
            <p>
              Um deles, o Leonardo, empresário, tomava decisão pela nota de recuperação do aparelho, e a
              nota não batia com o que ele sentia. Paramos de seguir o número pronto e fomos olhar a
              rotina dele e a regularidade do sono. O resultado apareceu no treino e nos marcadores
              metabólicos dos exames.
            </p>
            <p>
              Hoje, na Wealth & Wellness, eu acompanho cada cliente pelo dado do próprio wearable, com uma
              leitura semanal do que os números mostraram. Estudo nutrição. E trabalho com poucas pessoas
              por vez, porque cada relatório passa por mim antes de chegar até você.
            </p>
          </div>
        </div>
      </section>

      {/* S16 · GARANTIA (dark) */}
      <section id="garantia" className="bg-[var(--bg-elevated)] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_DARK}>
            7 dias de arrependimento, conforme a lei, mais a minha garantia de 30 dias com condições
          </h2>
          <p className={`mt-6 max-w-[680px] ${BODY_DARK}`}>
            Nos primeiros 7 dias você tem o direito de arrependimento previsto em lei. Além dele, vale a
            minha garantia de 30 dias: nos primeiros 30 dias, se você vier às calls, configurar o app e
            seguir o protocolo, e ainda assim não tiver clareza e autonomia sobre os seus próprios dados,
            eu devolvo o valor do primeiro mês ou estendo o suporte, à sua escolha.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="border border-[var(--border-hover)] bg-[var(--bg-card)] p-8 text-center">
              <p className="card-title">7 dias</p>
              <p className={`mt-2 ${BODY_DARK}`}>arrependimento, conforme a lei</p>
            </div>
            <div className="border border-[var(--border-hover)] bg-[var(--bg-card)] p-8 text-center">
              <p className="card-title">30 dias</p>
              <p className={`mt-2 ${BODY_DARK}`}>com condições, no contrato</p>
            </div>
          </div>
          <ul className={`mt-8 max-w-[680px] space-y-3 ${BODY_DARK}`}>
            <li className="flex gap-3">
              <Check />
              você compareceu às calls do período
            </li>
            <li className="flex gap-3">
              <Check />
              configurou o app
            </li>
            <li className="flex gap-3">
              <Check />
              seguiu o protocolo
            </li>
            <li className="flex gap-3">
              <Check />e ainda assim não teve clareza e autonomia sobre os seus próprios dados
            </li>
          </ul>
          <p className={`mt-6 max-w-[680px] ${BODY_DARK}`}>
            A garantia cobre a parte que depende de mim: você entender os seus próprios números.
          </p>
        </div>
      </section>

      {/* S17 · VAGAS (light) */}
      <section id="vagas" className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_LIGHT}>10 vagas nesta turma</h2>
          <p className={`mt-6 max-w-[680px] ${BODY_LIGHT}`}>{proximaTurmaTexto()}</p>
        </div>
      </section>

      {/* S18 · CTA FINAL HÍBRIDO (dark) */}
      <section id="oferta" className="bg-[var(--bg)] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={`${H2_DARK} text-center`}>Dois caminhos, os dois válidos</h2>

          <div className="mx-auto mt-12 max-w-[680px] border border-[var(--border-hover)] bg-[var(--bg-card)] p-6 text-center md:p-8">
            <p className="card-title">Já decidi</p>
            <div className="mt-6 flex flex-col items-center gap-4">
              <a
                href={cta180}
                data-cta="cta-final-180"
                data-plan="180d"
                target="_blank"
                rel="noopener noreferrer"
                className={CTA_IN_CARD_CLASS}
              >
                QUERO O PROTOCOL DE 180 DIAS
              </a>
              <a
                href={cta90}
                data-cta="cta-final-90"
                data-plan="90d"
                target="_blank"
                rel="noopener noreferrer"
                className={CTA_OUTLINE_IN_CARD_CLASS}
              >
                QUERO O PROTOCOL DE 90 DIAS
              </a>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-[680px] border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center md:p-8">
            <p className="card-title">Quero conversar antes</p>
            <p className={`mt-4 ${BODY_DARK}`}>
              Eu trabalho com poucas pessoas, e precisa fazer sentido dos dois lados. Se você quer ter
              certeza antes de decidir, me chama no WhatsApp. Na noite de quinta 29/10 eu respondo um por
              um até o fim da sessão extra.
            </p>
            <a
              href={ctaWhatsConversar}
              data-cta="whatsapp-conversar"
              target="_blank"
              rel="noopener noreferrer"
              className={`${CTA_OUTLINE_IN_CARD_CLASS} mt-6`}
            >
              CONVERSAR NO WHATSAPP
            </a>
          </div>

          <div className="mx-auto mt-8 max-w-[680px]">
            <p className="card-title text-center">Depois da compra</p>
            <ol className={`mt-6 space-y-4 ${BODY_DARK}`}>
              <li>
                <strong className="text-[var(--text-1)]">1 · Pagamento e contrato.</strong> Checkout
                seguro, no Pix ou no cartão, em até 3x no programa de 90 dias e em até 6x no de 180. O
                contrato chega em até 24 horas depois do pagamento.
              </li>
              <li>
                <strong className="text-[var(--text-1)]">2 · Cadastro e onboarding.</strong> Você fala
                comigo no WhatsApp profissional, faz o seu cadastro e agenda o seu onboarding.
              </li>
              <li>
                <strong className="text-[var(--text-1)]">3 · Grupo individual.</strong> Eu ou o time W&W
                abrimos o seu grupo de acompanhamento, que é individual: só você e o time W&W.
              </li>
            </ol>
            <div className="mt-6 text-center">
              <a
                href={ctaWhatsCadastro}
                data-cta="whatsapp-cadastro"
                target="_blank"
                rel="noopener noreferrer"
                className={CTA_OUTLINE_IN_CARD_CLASS}
              >
                FAZER MEU CADASTRO NO WHATSAPP
              </a>
            </div>
            <p className={`mt-6 text-center text-[0.9375rem] text-[rgba(244,242,238,0.6)]`}>
              Pix ou cartão (até 6x no 180 dias, até 3x no 90). Contrato em até 24 horas. Cadastro e
              agendamento do onboarding no meu WhatsApp profissional. Grupo de acompanhamento individual.
            </p>
          </div>
        </div>
      </section>

      {/* S19 · PERGUNTAS DIRETAS (light) */}
      <section id="faq" className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_LIGHT}>Perguntas diretas</h2>
          <div className="mt-10 max-w-[820px] space-y-8">
            {FAQ.map((item) => (
              <div key={item.q} className="border-b border-[rgba(13,13,13,0.12)] pb-8 last:border-0">
                <p className={`${BODY_LIGHT} font-medium text-[#0D0D0D]`}>{item.q}</p>
                <p className={`mt-3 ${BODY_LIGHT}`}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProtocoloStickyBuyBar />
      <MetaPixel />
      <ProtocoloAnalytics />
    </div>
  );
}
