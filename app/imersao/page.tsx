import type { Metadata } from 'next';
import Image from 'next/image';
import { isExternalLink } from '@/lib/core/links.core';
import {
  IMERSAO_CHECKOUT_URL,
  IMERSAO_SALES_CLOSED_MESSAGE,
  imersaoCtaHref,
  imersaoSalesOpen,
} from '@/lib/imersao';
import { StickyBuyBar } from '@/components/imersao/StickyBuyBar';
import { MetaPixel } from '@/components/MetaPixel';
import { ImersaoAnalytics } from '@/components/imersao/ImersaoAnalytics';

/**
 * A página é gerada estaticamente, mas o fechamento das vendas (ver
 * `IMERSAO_SALES_CLOSE_AT` em `lib/imersao.ts`) é um relógio, não um deploy.
 * `revalidate = 60` transforma isto em ISR: no máximo um minuto depois de
 * 28/10 às 19h30, a próxima visita já recebe a página regenerada com
 * `imersaoSalesOpen()` falso, sem precisar de `npx vercel --prod` na hora do
 * evento. O check do lado do cliente em `ImersaoAnalytics` cobre a janela de
 * até 60s em que um HTML gerado antes do fechamento ainda pode estar servido.
 */
export const revalidate = 60;

/**
 * A página do evento ao vivo, isolada de propósito.
 *
 * Ela mora direto em `app/imersao/`, fora de `(site)` e de `(event)`: sem um
 * `layout.tsx` de grupo por cima dela, só o `RootLayout` (html/body/skip
 * link) chega até aqui. Nada de `SiteHeader`, `SiteFooter` ou do `Header`
 * dourado do `/connect` — a regra desta venda é que o topo da página é o
 * título, sem logo, sem selo, sem cromo institucional.
 *
 * Server Component: a própria página não tem um único evento de interação
 * além de âncora e link. As três ilhas de cliente que ela monta —
 * `StickyBuyBar`, `MetaPixel` e `ImersaoAnalytics` — existem por motivos que
 * só existem no navegador (IntersectionObserver, localStorage, scroll) e
 * nenhuma delas precisa que a página em volta vire cliente também.
 *
 * O CTA não usa o `components/ui/Button.tsx` compartilhado: aquele é o botão
 * de contorno fino do resto do site, e esta página pediu um botão sólido,
 * cor cheia, só dela. Também não vira um componente local que repassa a
 * prop `href`, porque `tests/imersao.test.ts` lê o texto-fonte da página e
 * procura `href={cta}` literal em cada CTA; um wrapper trocaria isso por
 * `href={href}` e quebraria a varredura sem quebrar nada de verdade.
 *
 * `container-lp` (globals.css) trava `max-width: 1440px` sem estar dentro de
 * um `@layer` — e CSS não em camada sempre vence CSS em camada, então um
 * `max-w-[680px]` do Tailwind escrito NO MESMO elemento que `container-lp`
 * é ignorado, calado. As seções 6 e 9 caíam nessa: o texto media a largura
 * inteira do container (1440px), bem além dos ~680px pedidos. A saída é
 * nunca combinar os dois na mesma tag — `container-lp` fica num elemento,
 * o `max-w-[680px]` (com ou sem `mx-auto`) num filho dele. Pelo mesmo motivo
 * `.section-title`/`.eyebrow`/`.meta` (também fora de `@layer`) não recebem
 * um tamanho ou cor diferente colado na mesma classe: essas seções escrevem
 * o estilo do zero em vez de tentar sobrescrever a classe global.
 */
const CTA_CLASS =
  'inline-flex w-full items-center justify-center rounded-full bg-[#C9A84C] px-8 py-[18px] ' +
  'text-[1.0625rem] font-semibold text-[#0D0D0D] transition-colors duration-300 hover:bg-[#D4B85C] sm:w-auto';

/** Um H2 só, usado por toda seção; a cor é a única coisa que muda com o fundo. */
const H2 = 'font-display text-[1.75rem] md:text-[2.25rem] leading-[1.1] tracking-[-0.02em]';
const H2_DARK = `${H2} text-[var(--text-1)]`;
const H2_LIGHT = `${H2} text-[#0D0D0D]`;

/** Corpo de texto: 16px no celular, 17px a partir do desktop, como pedido. */
const BODY_LIGHT = 'text-[1.09375rem] md:text-[1.1875rem] leading-[1.6] text-[#2a2a2a]';
const BODY_DARK = 'text-[1.09375rem] md:text-[1.1875rem] leading-[1.6] text-[rgba(244,242,238,0.78)]';

/** Rótulo pequeno (data, "noite X"), grande o bastante e com contraste AA. */
const CAPTION_DARK = 'text-[0.9375rem] uppercase tracking-[0.08em] text-[rgba(244,242,238,0.78)]';
const KICKER_GOLD = 'text-[0.875rem] uppercase tracking-[0.1em] text-[var(--accent)]';
/** O eyebrow do herói precisa de um tamanho que `.eyebrow` (global) não dá
 *  sem o mesmo problema de especificidade descrito acima. */
const HERO_EYEBROW =
  'font-[family-name:var(--font-label)] text-[0.8125rem] uppercase tracking-[0.15em] text-[var(--accent)] text-balance';

/**
 * Prints reais de alunos W&W (destaque "Depoimentos" do Instagram + grupos de
 * acompanhamento), recortados só no balão da mensagem: sem nome, sem foto de
 * perfil, sem e-mail. Publicados com o OK do Kauã em 23/09/2026. Ordem: o
 * primeiro é o Whoop creditando a regularidade do sono, a prova direta da
 * Hora Fixa.
 */
const DEPOIMENTOS = [
  {
    src: '/photos/depoimentos/01-whoop-age.jpg',
    w: 630,
    h: 1270,
    alt: 'Print do Whoop de uma aluna: idade biológica 52,8, e a mensagem dela contando que estava em 62 quando começou',
    label: 'Aluna · Whoop',
    quote: 'Tava 62 qdo começamos.',
    detail: 'Whoop Age hoje: 52,8',
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
    src: '/photos/depoimentos/03-antes-depois.jpg',
    w: 591,
    h: 1112,
    alt: 'Aluno envia fotos de quando entrou e de hoje: seco e desenhado como queria',
    label: 'Aluno',
    quote: 'Seco e desenhado como eu queria.',
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

const TITLE = 'Imersão Performance e Longevidade · 28 e 29/10';
const DESCRIPTION =
  'Sem aumentar uma hora de treino e sem precisar dormir mais. Em duas noites ao vivo você define a hora que vai organizar o seu dia e aprende a ler, no seu próprio relógio ou anel, os três números que a nota da manhã esconde.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // `metadataBase` (app/layout.tsx) resolve este caminho pra uma URL
  // absoluta; o arquivo `opengraph-image.tsx` ao lado desta página já entra
  // sozinho por convenção do Next, então não precisamos listar `images` aqui
  // — listar de novo duplicaria a tag `og:image`.
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
  // O checkout da Hotmart ainda não existe (ver lib/imersao.ts). Enquanto
  // IMERSAO_CHECKOUT_URL for null, esta página não vende nada de verdade,
  // então não deve ser indexada.
  ...(IMERSAO_CHECKOUT_URL ? {} : { robots: { index: false, follow: false } }),
};

/** `tone`: `gold` (padrão, fundo escuro), `goldLight` (fundo claro, mesmo
 *  gesto de "sim") e `muted` — o "não" da lista "Para quem não é", que não
 *  ganha destaque dourado porque não é uma vantagem, é uma exclusão. */
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

export default function ImersaoPage() {
  const cta = imersaoCtaHref();
  const external = isExternalLink(cta);
  const salesOpen = imersaoSalesOpen();
  const ctaProps = {
    target: external ? '_blank' : undefined,
    rel: external ? 'noopener noreferrer' : undefined,
  } as const;

  return (
    // `pb-20 md:pb-0`: espaço reservado pro rodapé fixo do celular
    // (StickyBuyBar, ~64px + safe-area) nunca tampar o fim da última seção
    // visível enquanto ele estiver no ar; o próprio componente já some perto
    // de `#ingresso`, isto é só o cinto de segurança contra bounce/overscroll.
    <div className="pb-20 md:pb-0">
      {/* 1. HERO (dark). `pt-10` (em vez de `pt-16`, só abaixo de `md`) e os
          `mt-6 md:mt-8` na legenda e no preço: no celular, com o banner de
          consentimento (MetaPixel) no ar antes de qualquer escolha, o herói
          precisa terminar alto o bastante pra esse CTA nunca ficar embaixo
          dele no primeiro carregamento, a 390×844. Desktop/tablet (`md:`)
          ficam exatamente como estavam. */}
      <section className="bg-[var(--bg)] pt-10 pb-20 md:pt-24 md:pb-28">
        <div className="container-lp grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr] md:gap-16">
          <div>
            <p className={HERO_EYEBROW}>IMERSÃO PERFORMANCE E LONGEVIDADE · 2 noites ao vivo</p>
            <h1 className="page-title mt-4 text-[2rem] leading-[1.08] md:text-[2.75rem] lg:text-[3.25rem]">
              O mesmo ritmo de trabalho, mais energia na reunião das 18h e o HRV subindo no seu wearable
              já na primeira semana.
            </h1>
            <p className={`mt-6 max-w-[560px] ${BODY_DARK}`}>
              Sem aumentar uma hora de treino e sem precisar dormir mais. Em duas noites ao vivo
              você define a hora que vai organizar o seu dia e aprende a ler, no seu próprio
              relógio ou anel, os três números que a nota da manhã esconde.
            </p>
            <p className={`mt-6 md:mt-8 ${CAPTION_DARK}`}>
              28 e 29 de outubro, quarta e quinta · 19h30 às 21h30 (Brasília) · Ao vivo no Google
              Meet, com replay até domingo, 01/11, às 23h59
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-6 md:mt-8">
              <p className="stat-num">Ingresso R$ 97</p>
            </div>
            {salesOpen && (
              <a
                href={cta}
                data-cta="hero"
                target={ctaProps.target}
                rel={ctaProps.rel}
                className={`${CTA_CLASS} mt-6`}
              >
                GARANTIR MEU INGRESSO · R$ 97
              </a>
            )}
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

      {/* 2. POR QUE VOCÊ AINDA NÃO CONSEGUIU (light) — título à esquerda, texto à direita no desktop */}
      <section className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp grid gap-8 md:grid-cols-[280px_1fr] md:gap-16">
          <h2 className={H2_LIGHT}>Por que você ainda não conseguiu</h2>
          <div className={`max-w-[680px] space-y-6 ${BODY_LIGHT}`}>
            <p>
              Não é falta de disciplina. Você já treinou cinco vezes por semana, já trocou de
              suplemento, já fez check-up que veio normal, já comprou o aparelho mais caro do
              mercado. E toda manhã abre o app pra ver uma nota. O problema está aí: o score de
              prontidão. Ninguém provou que ele mede o que promete, e o seu dia passou a depender
              dele.
            </p>
            <p>
              A nota dá um veredito sobre a noite de ontem, e você tenta consertar ontem: dorme
              mais cedo na quarta, fica na cama até as 9h no sábado pra compensar. Terça às 6h,
              quinta às 7h30, sábado às 9h. Cada horário diferente é um pequeno fuso que você
              mesmo provoca. Um estudo com mais de 60 mil pessoas do UK Biobank mostrou que a
              regularidade do sono pesou mais na saúde do que a quantidade de horas. É isso que eu
              chamo de{' '}
              <strong className="font-display font-semibold italic text-[#0D0D0D]">
                A Hora Fixa
              </strong>
              : uma hora pra acordar, sete dias por semana, e três números no lugar da nota.
            </p>
            <p>
              Por isso uma semana basta. Não é construir condicionamento, é parar de bagunçar o
              relógio. Quando a hora para de mudar, o seu HRV e a sua frequência cardíaca de
              repouso respondem em dias, e você vê isso no gráfico do seu próprio aparelho.
            </p>
          </div>
        </div>
      </section>

      {/* 3. PARA QUEM É (dark) */}
      <section className="bg-[var(--bg-elevated)] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_DARK}>Para quem é</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-[1.35fr_1fr] md:items-start">
            <div className="border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <ul className={`space-y-4 ${BODY_DARK}`}>
                <li className="flex gap-3">
                  <Check />
                  Você olha o Whoop, o Oura ou o Garmin toda manhã e não sabe o que fazer com
                  aquele número.
                </li>
                <li className="flex gap-3">
                  <Check />O seu check-up vem normal e a reunião das 18h continua pesando.
                </li>
                <li className="flex gap-3">
                  <Check />
                  No fim de semana você dorme até mais tarde pra compensar a semana.
                </li>
                <li className="flex gap-3">
                  <Check />
                  Você já treina, já cuida da alimentação, e o número da manhã sobe e desce sem
                  explicação.
                </li>
                <li className="flex gap-3">
                  <Check />A sua agenda tem viagem, jantar de negócios e call tarde da noite, e
                  nenhum plano que você tentou sobreviveu a ela.
                </li>
              </ul>
            </div>
            <div className="border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <p className="card-title">Para quem não é</p>
              <ul className={`mt-5 space-y-4 ${BODY_DARK}`}>
                <li className="flex gap-3">
                  <Check tone="muted" />
                  Quem não usa relógio ou anel inteligente: a imersão inteira é feita em cima do
                  seu dado.
                </li>
                <li className="flex gap-3">
                  <Check tone="muted" />
                  Quem procura tratamento de insônia ou de distúrbio do sono: isso é com o seu
                  médico.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MATERIAIS DIDÁTICOS (light) */}
      <section className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_LIGHT}>Materiais didáticos</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Ficha da Hora Fixa.',
                body: 'Você preenche na primeira noite, junto comigo, e sai com a sua hora de acordar e a sua janela de 30 minutos definidas.',
              },
              {
                title: 'Roteiro de Leitura dos 30 Dias.',
                body: 'O passo a passo pra abrir o histórico do seu Whoop, Oura, Garmin ou Apple Watch e achar a sua média e o quanto o seu horário variou. Usado ao vivo na segunda noite.',
              },
              {
                title: 'Painel dos Três Números.',
                body: 'Uma página pra anotar a hora em que acordou, o HRV contra a sua média e a frequência cardíaca de repouso. Dois minutos por manhã, a partir de quinta.',
              },
              {
                title: 'Protocolo das Exceções.',
                body: 'O que fazer na noite do jantar que acabou tarde, no voo cedo e no sábado, sem quebrar a hora fixa. Você usa já no primeiro fim de semana.',
              },
            ].map((item, index) => (
              <div key={item.title} className="border border-[rgba(13,13,13,0.12)] bg-[#FCFBF8] p-6">
                <span aria-hidden="true" className="font-display block text-[1rem] text-[#8C7440]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className={`mt-2 ${BODY_LIGHT} text-[#0D0D0D]`}>
                  <strong className="font-medium">{item.title}</strong> {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PROGRAMAÇÃO (dark) */}
      <section id="programacao" className="bg-[var(--bg-elevated)] py-20 md:py-28">
        <div className="container-lp">
          <h2 className={H2_DARK}>Programação</h2>
          <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex-1 border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <p className={KICKER_GOLD}>NOITE 1 · QUARTA, 28/10 · A SUA HORA</p>
              <p className={`mt-5 ${BODY_DARK}`}>
                Por que o horário pesa mais que as horas dormidas, e por que a nota da manhã
                esconde isso. Você entende o que o seu aparelho mede de verdade e o que ele só
                estima.
              </p>
              <p className={`mt-4 ${BODY_DARK}`}>
                <strong className="text-[var(--text-1)]">Na prática:</strong> preenchemos juntos a
                Ficha da Hora Fixa, em cima da sua agenda real, com as viagens e os jantares.
              </p>
              <p className={`mt-4 ${BODY_DARK}`}>
                <strong className="text-[var(--text-1)]">Você termina a primeira noite com:</strong>{' '}
                a sua hora de acordar + a janela de 30 minutos + o plano pra quinta de manhã.
              </p>
            </div>

            <div className="flex items-center justify-center md:w-12" aria-hidden="true">
              <span className="rotate-90 text-lg text-[var(--accent)] md:rotate-0">→</span>
            </div>

            <div className="flex-1 border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <p className={KICKER_GOLD}>NOITE 2 · QUINTA, 29/10 · OS SEUS NÚMEROS</p>
              <p className={`mt-5 ${BODY_DARK}`}>
                Você acorda na hora nova e chega com o aparelho na mão. Abrimos os seus últimos 30
                dias e trocamos a nota por três números.
              </p>
              <p className={`mt-4 ${BODY_DARK}`}>
                <strong className="text-[var(--text-1)]">Na prática:</strong> seguimos o Roteiro de
                Leitura dos 30 Dias no seu próprio histórico e montamos o seu Painel dos Três
                Números com a sua média.
              </p>
              <p className={`mt-4 ${BODY_DARK}`}>
                <strong className="text-[var(--text-1)]">Você termina a segunda noite com:</strong>{' '}
                a sua linha de base de HRV e de frequência de repouso + o quanto o seu horário
                variou no último mês + o Protocolo das Exceções pra primeira semana.
              </p>
            </div>
          </div>

          {salesOpen && (
            <div className="mt-12 flex justify-center">
              <a href={cta} data-cta="programacao" target={ctaProps.target} rel={ctaProps.rel} className={CTA_CLASS}>
                GARANTIR MEU INGRESSO
              </a>
            </div>
          )}
        </div>
      </section>

      {/* 6. O QUE VAI ACONTECER AO VIVO (light) */}
      <section className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp">
          <div className="max-w-[680px]">
            <h2 className={H2_LIGHT}>O que vai acontecer ao vivo</h2>
            <ul className="mt-10 space-y-5">
              <li className={`flex gap-3 ${BODY_LIGHT}`}>
                <Check tone="goldLight" />
                Você define a sua hora com a agenda aberta, na minha frente, em vez de levar mais
                uma regra pra testar sozinho.
              </li>
              <li className={`flex gap-3 ${BODY_LIGHT}`}>
                <Check tone="goldLight" />
                Na segunda noite eu leio ao vivo o gráfico de quem quiser mostrar, e você vê como a
                leitura muda de uma pessoa pra outra.
              </li>
              <li className={`flex gap-3 ${BODY_LIGHT}`}>
                <Check tone="goldLight" />
                Pergunta respondida na hora, sobre o seu aparelho e a sua rotina.
              </li>
              <li className={`flex gap-3 ${BODY_LIGHT}`}>
                <Check tone="goldLight" />
                Sala fechada no Google Meet, sem plateia de transmissão. Replay no grupo do evento
                até domingo, 01/11, às 23h59.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 7. POR QUE O INGRESSO É BARATO E POR QUE NÃO É DE GRAÇA (dark) */}
      <section className="bg-[var(--bg-elevated)] py-20 md:py-28">
        <div className="container-lp grid gap-12 md:grid-cols-[minmax(0,680px)_auto] md:justify-start md:gap-20 md:items-center">
          <div>
            <h2 className={H2_DARK}>Por que o ingresso é barato e por que não é de graça</h2>
            <div className={`mt-8 space-y-5 ${BODY_DARK}`}>
              <p>
                É barato porque o preço não é o que deveria te separar disso. Eu quero você na
                sala, com o aparelho na mão, saindo com a sua hora definida.
              </p>
              <p>
                Não é de graça porque evento gratuito enche de inscrito que não aparece, e aqui a
                segunda noite só funciona pra quem esteve na primeira. Noventa e sete reais filtram
                presença, não bolso.
              </p>
            </div>
          </div>
          <div className="shrink-0 border border-[var(--border-hover)] bg-[var(--bg-card)] px-10 py-10 text-center">
            <p className={CAPTION_DARK}>Ingresso</p>
            <p className="stat-num mt-2">R$ 97</p>
            {salesOpen && (
              <a
                href={cta}
                data-cta="oferta"
                target={ctaProps.target}
                rel={ctaProps.rel}
                className={`${CTA_CLASS} mt-6`}
              >
                GARANTIR MEU INGRESSO
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 8. QUEM VAI CONDUZIR (light) — título e foto à esquerda, texto à direita no desktop */}
      <section className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp grid items-start gap-10 md:grid-cols-[280px_1fr] md:gap-16">
          <div>
            <h2 className={H2_LIGHT}>Quem vai conduzir</h2>
            <div className="relative mt-6 aspect-[3/4] w-full overflow-hidden">
              <Image
                src="/photos/kaua-portrait-close.jpg"
                alt="Kauã Ramos, health manager da Wealth & Wellness"
                fill
                sizes="(max-width: 768px) 100vw, 280px"
                quality={75}
                className="object-cover"
                // Sem `priority`, mas com `loading="eager"`: esta foto está
                // abaixo da dobra, então não precisa do preload de LCP, mas
                // precisa existir no HTML sem depender do IntersectionObserver
                // do lazy-loading nativo. Um screenshot de página inteira
                // tirado logo após o load (sem esperar o scroll dar tempo do
                // navegador disparar o carregamento) capturava o card vazio,
                // só com a legenda — a imagem carregava, só que tarde demais
                // pro frame que já tinha sido composto.
                loading="eager"
              />
            </div>
          </div>
          <div className={`max-w-[680px] space-y-5 ${BODY_LIGHT}`}>
            <p>
              Eu cuido da saúde, da performance e da longevidade de quem não tem tempo pra cuidar
              delas. Sou Kauã Ramos, health manager, e passei por um hub internacional de
              wellness acompanhando empresários de 45, 50 anos ou mais: agenda cheia, viagem,
              jantar de negócios e um relógio caro no pulso. Já são centenas de clientes com esse
              perfil.
            </p>
            <p>
              Hoje, na Wealth & Wellness, eu acompanho cada cliente pelo dado do próprio
              wearable, com uma leitura semanal do que os números mostraram. Estudo nutrição e
              sou coach de CrossFit Level 1, mas pra esse perfil o que mais muda o jogo quase
              nunca é treino a mais. Por isso esta imersão começa pela Hora Fixa.
            </p>
          </div>
        </div>
      </section>

      {/* 8b. PROVA (light, continua o "quem vai conduzir") — cada depoimento é
          um cartão: rótulo neutro, a frase em texto de verdade (o que se lê),
          e o print embaixo só como evidência, pequeno de propósito pra
          renderizar nítido em vez de esticado. Desktop = grid de 4 colunas
          (8 prints ÷ 4 fecha 2 fileiras cheias, sem buraco de coluna
          incompleta — por isso grid, não masonry). Mobile = carrossel
          horizontal com espiada do próximo cartão, pra não somar altura. */}
      <section
        id="depoimentos"
        aria-labelledby="depoimentos-titulo"
        className="border-t border-[rgba(13,13,13,0.08)] bg-[#F4F2EE] pb-20 pt-16 md:pb-28 md:pt-20"
      >
        <div className="container-lp">
          <p className="text-[0.875rem] uppercase tracking-[0.1em] text-[#8C7440]">Alunos W&W</p>
          <h2 id="depoimentos-titulo" className={`${H2_LIGHT} mt-3`}>
            O que chega no meu WhatsApp
          </h2>
          <p className={`mt-4 max-w-[680px] ${BODY_LIGHT}`}>
            Prints reais de alunos do acompanhamento, com os nomes ocultos.
          </p>
        </div>
        {/* `container-lp` is plain CSS, so `md:container-lp` would do nothing: the
            same box is rebuilt with utilities so it only applies from md up and the
            mobile carousel keeps running edge to edge. */}
        <div className="md:mx-auto md:max-w-[1440px] md:px-10 lg:px-16">
          <ul
            className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] md:grid md:grid-cols-2 md:items-start md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden"
            aria-label="Prints de mensagens de alunos"
          >
            {DEPOIMENTOS.map((d) => (
              <li
                key={d.src}
                className="w-[82vw] max-w-[340px] shrink-0 snap-center rounded-[14px] border border-[rgba(13,13,13,0.08)] bg-[#FCFBF8] p-5 shadow-[0_8px_24px_rgba(13,13,13,0.06)] md:w-auto md:max-w-none md:shrink"
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
        </div>
      </section>

      {/* 9. FECHAMENTO (dark) */}
      <section id="ingresso" className="bg-[var(--bg)] py-20 md:py-28">
        <div className="container-lp text-center">
          <div className="mx-auto max-w-[680px]">
            <p className={BODY_DARK}>
              Você quer manter o ritmo que tem hoje e chegar inteiro ao fim do dia. Em duas noites
              você define a sua hora fixa e aprende a ler três números no lugar da nota. Sai com a
              sua hora, a sua linha de base e o plano da primeira semana, e acompanha no seu próprio
              aparelho se está funcionando.
            </p>

            <h2 className={`${H2_DARK} mt-10`}>Imersão Performance e Longevidade</h2>
            <p className={`mt-4 ${CAPTION_DARK}`}>
              28 e 29 de outubro · 19h30 às 21h30 · Ao vivo no Google Meet, com replay até
              domingo, 01/11, às 23h59
            </p>
            <p className="stat-num mt-8">Ingresso R$ 97</p>
            {salesOpen ? (
              <a
                href={cta}
                data-cta="fechamento"
                target={ctaProps.target}
                rel={ctaProps.rel}
                className={`${CTA_CLASS} mt-8`}
              >
                GARANTIR MEU INGRESSO
              </a>
            ) : (
              <p className={`mt-8 ${BODY_DARK}`}>{IMERSAO_SALES_CLOSED_MESSAGE}</p>
            )}
          </div>
        </div>
      </section>

      <StickyBuyBar />
      <MetaPixel />
      <ImersaoAnalytics />
    </div>
  );
}
