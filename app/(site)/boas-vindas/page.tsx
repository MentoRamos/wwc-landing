import type { Metadata } from 'next';
import { Band } from '@/components/ui/Band';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GuidesGate } from '@/components/boas-vindas/GuidesGate';
import { DESAFIO, NIVA_OFFER_URL, WELCOME_VIDEO_ID } from '@/lib/boas-vindas';

/**
 * Members page of the W&W Circle founding class. Reached from the invite, not
 * from search: never indexed, and absent from the sitemap on purpose.
 */
export const metadata: Metadata = {
  title: 'Boas-vindas · W&W Circle',
  description: 'Como funciona o grupo, o Desafio 21 dias e o presente de boas-vindas.',
  robots: { index: false, follow: false },
};

const BODY = 'text-[1.0625rem] leading-[1.65] text-[var(--text-2)]';

export default function BoasVindasPage() {
  return (
    <main className="container-lp flex flex-col gap-14 pt-12 pb-24 md:gap-20 md:pt-20">
      <SectionHeading
        eyebrow="W&W CIRCLE · TURMA FUNDADORA"
        title="Bem-vindo à turma fundadora do W&W Circle"
        lede="Você chegou antes de todo mundo. Esta página tem o que precisa saber para começar bem."
      />

      <section aria-label="Vídeo de boas-vindas">
        <div className="relative aspect-video w-full overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
          {WELCOME_VIDEO_ID ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${WELCOME_VIDEO_ID}?rel=0`}
              title="Boas-vindas do Kauã"
              allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="eyebrow">Vídeo de boas-vindas</p>
              <p className="font-display text-[1.375rem] text-[var(--text-1)]">O vídeo chega em breve.</p>
              <p className="text-sm text-[var(--text-3)]">São 90 segundos. Avisamos no grupo quando entrar.</p>
            </div>
          )}
        </div>
      </section>

      <Band
        first
        eyebrow="Como funciona"
        title="Dois espaços, um combinado"
        lede="Grupo silencioso fora do horário é normal. Não é abandono, é o desenho."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="font-display text-[1.25rem] text-[var(--text-1)]">Avisos</h3>
            <p className={`mt-3 ${BODY}`}>
              Só o Kauã posta: o artigo do dia às 12h15, as novidades e o desafio. Leia, não precisa responder.
            </p>
          </div>
          <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="font-display text-[1.25rem] text-[var(--text-1)]">Conversa</h3>
            <p className={`mt-3 ${BODY}`}>
              Todo mundo fala. Dúvida, resultado, vitória pequena, pergunta para a turma.
            </p>
          </div>
        </div>
        <p className={`mt-6 ${BODY}`}>
          O Kauã responde na <strong className="text-[var(--text-1)]">Roda do meio-dia</strong>: 12h15, de
          segunda a sexta.
        </p>
      </Band>

      <Band
        eyebrow="Primeiro passo"
        title="Se apresente na Conversa"
        lede="Leva dois minutos e é o que faz o grupo parecer gente."
      >
        <p className={`border-l-2 border-[var(--accent)] pl-5 ${BODY}`}>
          Nome, cidade, qual wearable você usa e 1 objetivo para os próximos 21 dias.
        </p>
      </Band>

      <Band
        eyebrow={`${DESAFIO.inicio} a ${DESAFIO.fim}`}
        title={DESAFIO.nome}
        lede="Três semanas, um hábito por semana. O número de partida e o de chegada são seus."
      >
        <ol className="flex flex-col gap-4">
          {DESAFIO.etapas.map((etapa) => (
            <li key={etapa.rotulo} className="border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <p className="eyebrow">{etapa.rotulo}</p>
              <p className={`mt-2 ${BODY}`}>{etapa.texto}</p>
            </li>
          ))}
        </ol>
      </Band>

      <Band
        eyebrow="Presente"
        title="Os 6 guias em PDF"
        lede="Nome e e-mail e os seis ficam liberados aqui mesmo."
      >
        <GuidesGate />
      </Band>

      <Band
        eyebrow="NIVA grátis no desafio"
        title="Código do NIVA: chega aqui antes do Dia 0"
        lede="O app que acompanha o seu HRV e o seu sono durante as três semanas."
      >
        {NIVA_OFFER_URL ? (
          <Button href={NIVA_OFFER_URL} variant="primary" size="lg">
            Pegar o meu código
          </Button>
        ) : (
          <p className={`border border-[var(--border)] bg-[var(--bg-card)] p-5 ${BODY}`}>
            Em breve. O código aparece neste lugar antes de domingo, 25/10.
          </p>
        )}
      </Band>

      <Band eyebrow="Regras" title="Três combinados">
        <ul className={`flex flex-col gap-3 ${BODY}`}>
          <li>Sem venda e sem spam entre membros.</li>
          <li>Dado de saúde só se você quiser postar. Ninguém cobra.</li>
          <li>Respeito sempre, inclusive quando discordar.</li>
        </ul>
      </Band>
    </main>
  );
}
