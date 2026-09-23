import type { Metadata } from 'next';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { IMERSAO_CHECKOUT_URL, imersaoCtaHref } from '@/lib/imersao';

/**
 * A página do evento ao vivo, isolada de propósito.
 *
 * Ela mora direto em `app/imersao/`, fora de `(site)` e de `(event)`: sem um
 * `layout.tsx` de grupo por cima dela, só o `RootLayout` (html/body/skip
 * link) chega até aqui. Nada de `SiteHeader`, `SiteFooter` ou do `Header`
 * dourado do `/connect` — a regra desta venda é que o topo da página é o
 * título, sem logo, sem selo, sem cromo institucional.
 *
 * Server Component o tempo todo: a página não tem um único evento de
 * interação além de âncora e link, então não há motivo para JavaScript no
 * cliente.
 */
export const metadata: Metadata = {
  title: 'Imersão Performance e Longevidade · 29 e 30/09',
  description:
    'Sem aumentar uma hora de treino e sem precisar dormir mais. Em duas noites ao vivo você define a hora que vai organizar o seu dia e aprende a ler, no seu próprio relógio ou anel, os três números que a nota da manhã esconde.',
  // O checkout da Hotmart ainda não existe (ver lib/imersao.ts). Enquanto
  // IMERSAO_CHECKOUT_URL for null, esta página não vende nada de verdade,
  // então não deve ser indexada.
  ...(IMERSAO_CHECKOUT_URL ? {} : { robots: { index: false, follow: false } }),
};

function Check({ light = false }: { light?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border text-center text-[10px] leading-[14px] ${
        light ? 'border-[#8C7440] text-[#8C7440]' : 'border-[var(--accent)] text-[var(--accent)]'
      }`}
    >
      ✓
    </span>
  );
}

export default function ImersaoPage() {
  const cta = imersaoCtaHref();

  return (
    <>
      {/* 1. HERO (dark) */}
      <section className="bg-[var(--bg)] pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="container-lp grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr] md:gap-16">
          <div>
            <p className="eyebrow">IMERSÃO PERFORMANCE E LONGEVIDADE · 2 noites ao vivo</p>
            <h1 className="page-title mt-4 text-[2rem] leading-[1.08] md:text-[2.75rem] lg:text-[3.25rem]">
              O mesmo ritmo de trabalho, mais energia na reunião das 18h e o HRV subindo no seu wearable
              já na primeira semana.
            </h1>
            <p className="lede mt-6 max-w-none">
              Sem aumentar uma hora de treino e sem precisar dormir mais. Em duas noites ao vivo
              você define a hora que vai organizar o seu dia e aprende a ler, no seu próprio
              relógio ou anel, os três números que a nota da manhã esconde.
            </p>
            <p className="meta mt-8">
              29 e 30 de setembro, terça e quarta · 19h30 às 21h30 (Brasília) · Ao vivo no Google
              Meet, com gravação
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <p className="stat-num">
                Ingresso R$ 97
              </p>
            </div>
            <Button href={cta} variant="primary" size="lg" className="mt-6 w-full sm:w-auto">
              GARANTIR MEU INGRESSO · R$ 97
            </Button>
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden border border-[var(--border)] md:aspect-[3/4]">
            <Image
              src="/photos/kaua-portrait-seated.jpg"
              alt="Kauã Ramos, health manager da Wealth & Wellness"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg)]/40 via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* 2. POR QUE VOCÊ AINDA NÃO CONSEGUIU (light) */}
      <section className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp max-w-3xl">
          <h2 className="font-display text-[1.75rem] leading-[1.1] tracking-[-0.02em] text-[#0D0D0D] md:text-[2.25rem]">
            Por que você ainda não conseguiu
          </h2>
          <div className="mt-8 space-y-6 text-[1.0625rem] leading-[1.75] text-[rgba(13,13,13,0.72)]">
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
              chamo de <strong className="font-display font-normal not-italic text-[#8C7440]">A Hora Fixa</strong>:
              uma hora pra acordar, sete dias por semana, e três números no lugar da nota.
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
          <h2 className="section-title">Para quem é</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <ul className="space-y-4 text-[0.9375rem] leading-[1.6] text-[var(--text-2)]">
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
              <ul className="mt-5 space-y-4 text-[0.9375rem] leading-[1.6] text-[var(--text-2)]">
                <li className="flex gap-3">
                  <Check />
                  Quem não usa relógio ou anel inteligente: a imersão inteira é feita em cima do
                  seu dado.
                </li>
                <li className="flex gap-3">
                  <Check />
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
          <h2 className="font-display text-[1.75rem] leading-[1.1] tracking-[-0.02em] text-[#0D0D0D] md:text-[2.25rem]">
            Materiais didáticos
          </h2>
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
                body: 'Uma página pra anotar a hora em que acordou, o HRV contra a sua média e a frequência cardíaca de repouso. Dois minutos por manhã, a partir de quarta.',
              },
              {
                title: 'Protocolo das Exceções.',
                body: 'O que fazer na noite do jantar que acabou tarde, no voo cedo e no sábado, sem quebrar a hora fixa. Você usa já no primeiro fim de semana.',
              },
            ].map((item) => (
              <div key={item.title} className="border border-[rgba(13,13,13,0.12)] bg-[#FCFBF8] p-6">
                <p className="text-[0.9375rem] leading-[1.6] text-[#0D0D0D]">
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
          <h2 className="section-title">Programação</h2>
          <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-stretch">
            <div className="flex-1 border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <p className="meta text-[var(--accent)]">NOITE 1 · TERÇA, 29/09 · A SUA HORA</p>
              <p className="mt-5 text-[0.9375rem] leading-[1.7] text-[var(--text-2)]">
                Por que o horário pesa mais que as horas dormidas, e por que a nota da manhã
                esconde isso. Você entende o que o seu aparelho mede de verdade e o que ele só
                estima.
              </p>
              <p className="mt-4 text-[0.9375rem] leading-[1.7] text-[var(--text-2)]">
                <strong className="text-[var(--text-1)]">Na prática:</strong> preenchemos juntos a
                Ficha da Hora Fixa, em cima da sua agenda real, com as viagens e os jantares.
              </p>
              <p className="mt-4 text-[0.9375rem] leading-[1.7] text-[var(--text-2)]">
                <strong className="text-[var(--text-1)]">Você termina a primeira noite com:</strong>{' '}
                a sua hora de acordar + a janela de 30 minutos + o plano pra quarta de manhã.
              </p>
            </div>

            <div className="flex items-center justify-center md:w-12" aria-hidden="true">
              <span className="rotate-90 text-lg text-[var(--accent)] md:rotate-0">→</span>
            </div>

            <div className="flex-1 border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <p className="meta text-[var(--accent)]">NOITE 2 · QUARTA, 30/09 · OS SEUS NÚMEROS</p>
              <p className="mt-5 text-[0.9375rem] leading-[1.7] text-[var(--text-2)]">
                Você acorda na hora nova e chega com o aparelho na mão. Abrimos os seus últimos 30
                dias e trocamos a nota por três números.
              </p>
              <p className="mt-4 text-[0.9375rem] leading-[1.7] text-[var(--text-2)]">
                <strong className="text-[var(--text-1)]">Na prática:</strong> seguimos o Roteiro de
                Leitura dos 30 Dias no seu próprio histórico e montamos o seu Painel dos Três
                Números com a sua média.
              </p>
              <p className="mt-4 text-[0.9375rem] leading-[1.7] text-[var(--text-2)]">
                <strong className="text-[var(--text-1)]">Você termina a segunda noite com:</strong>{' '}
                a sua linha de base de HRV e de frequência de repouso + o quanto o seu horário
                variou no último mês + o Protocolo das Exceções pra primeira semana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. O QUE VAI ACONTECER AO VIVO (light) */}
      <section className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp max-w-3xl">
          <h2 className="font-display text-[1.75rem] leading-[1.1] tracking-[-0.02em] text-[#0D0D0D] md:text-[2.25rem]">
            O que vai acontecer ao vivo
          </h2>
          <ul className="mt-10 space-y-5">
            <li className="flex gap-3 text-[0.9375rem] leading-[1.65] text-[rgba(13,13,13,0.72)]">
              <Check light />
              Você define a sua hora com a agenda aberta, na minha frente, em vez de levar mais
              uma regra pra testar sozinho.
            </li>
            <li className="flex gap-3 text-[0.9375rem] leading-[1.65] text-[rgba(13,13,13,0.72)]">
              <Check light />
              Na segunda noite eu leio ao vivo o gráfico de quem quiser mostrar, e você vê como a
              leitura muda de uma pessoa pra outra.
            </li>
            <li className="flex gap-3 text-[0.9375rem] leading-[1.65] text-[rgba(13,13,13,0.72)]">
              <Check light />
              Pergunta respondida na hora, sobre o seu aparelho e a sua rotina.
            </li>
            <li className="flex gap-3 text-[0.9375rem] leading-[1.65] text-[rgba(13,13,13,0.72)]">
              <Check light />
              Sala fechada no Google Meet, sem plateia de transmissão. A gravação fica com você.
            </li>
          </ul>
        </div>
      </section>

      {/* 7. POR QUE O INGRESSO É BARATO E POR QUE NÃO É DE GRAÇA (dark) */}
      <section className="bg-[var(--bg-elevated)] py-20 md:py-28">
        <div className="container-lp grid gap-12 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-2xl">
            <h2 className="section-title">
              Por que o ingresso é barato e por que não é de graça
            </h2>
            <div className="mt-8 space-y-5 text-[0.9375rem] leading-[1.75] text-[var(--text-2)]">
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
          <div className="shrink-0 border border-[var(--border-hover)] bg-[var(--bg-card)] px-10 py-8 text-center">
            <p className="meta">Ingresso</p>
            <p className="stat-num mt-2">R$ 97</p>
          </div>
        </div>
      </section>

      {/* 8. QUEM VAI CONDUZIR (light) */}
      <section className="bg-[#F4F2EE] py-20 md:py-28">
        <div className="container-lp grid items-start gap-10 md:grid-cols-[240px_1fr] md:gap-14">
          <figure>
            <div className="relative aspect-[3/4] w-full overflow-hidden">
              <Image
                src="/photos/kaua-portrait-close.jpg"
                alt="Kauã Ramos"
                fill
                sizes="(max-width: 768px) 100vw, 240px"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 text-[0.75rem] uppercase tracking-[0.16em] text-[rgba(13,13,13,0.5)]">
              Kauã Ramos · Health manager
            </figcaption>
          </figure>
          <div>
            <h2 className="font-display text-[1.75rem] leading-[1.1] tracking-[-0.02em] text-[#0D0D0D] md:text-[2.25rem]">
              Quem vai conduzir
            </h2>
            <div className="mt-6 space-y-5 text-[1.0625rem] leading-[1.75] text-[rgba(13,13,13,0.72)]">
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
        </div>
      </section>

      {/* 9. FECHAMENTO (dark) */}
      <section id="ingresso" className="bg-[var(--bg)] py-20 md:py-28">
        <div className="container-lp max-w-2xl text-center">
          <p className="lede mx-auto max-w-none">
            Você quer manter o ritmo que tem hoje e chegar inteiro ao fim do dia. Em duas noites
            você define a sua hora fixa e aprende a ler três números no lugar da nota. Sai com a
            sua hora, a sua linha de base e o plano da primeira semana, e acompanha no seu próprio
            aparelho se está funcionando.
          </p>

          <h2 className="section-title mt-10">Imersão Performance e Longevidade</h2>
          <p className="meta mt-4">
            29 e 30 de setembro · 19h30 às 21h30 · Ao vivo no Google Meet, com gravação
          </p>
          <p className="stat-num mt-8">Ingresso R$ 97</p>
          <Button href={cta} variant="primary" size="lg" className="mt-8 w-full sm:w-auto">
            GARANTIR MEU INGRESSO
          </Button>
        </div>
      </section>
    </>
  );
}
