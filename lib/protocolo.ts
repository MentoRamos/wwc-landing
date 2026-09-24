/**
 * Single source of truth for the W&W Protocol offer page (`/imersao/protocolo`).
 *
 * Mirrors `lib/imersao.ts`: every CTA on the page reads a helper from here
 * instead of a literal URL, so a checkout link or a WhatsApp number only
 * ever changes in one place, and `tests/protocolo.test.ts` can scan the page
 * source for that exact call shape.
 */

/** Kiwify checkout for the 180-day Protocol (product created 23/09/2026,
 *  Pix or cartão até 6x). The recommended plan, and the primary CTA
 *  everywhere on the page. */
export const PROTOCOLO_CHECKOUT_URL_180D = 'https://pay.kiwify.com.br/TMQPoAC';

/** Kiwify checkout for the 90-day Protocol (Pix or cartão até 3x). Always the
 *  secondary CTA, never the first button in a pair. */
export const PROTOCOLO_CHECKOUT_URL_90D = 'https://pay.kiwify.com.br/ALCqRbo';

export type ProtocoloPlan = '180d' | '90d';

/** Every checkout CTA on the page resolves through this function, never a
 *  literal `https://pay.kiwify.com.br/...` written inline. */
export function protocoloCtaHref(plan: ProtocoloPlan = '180d'): string {
  return plan === '90d' ? PROTOCOLO_CHECKOUT_URL_90D : PROTOCOLO_CHECKOUT_URL_180D;
}

/** Kauã's WhatsApp profissional (+1 561 986-5175, same number as `/imersao`'s
 *  post-purchase step and the pitch's live Q&A). No parentheses/dashes: the
 *  wa.me path wants digits only. */
export const WHATSAPP_NUMBER = '15619865175';

/** Pre-filled messages from the copy doc (S18, Blocos B and C). Kept as named
 *  constants instead of inline strings so the two WhatsApp CTAs on the page
 *  can never drift from what the copy specifies. */
export const WHATSAPP_MESSAGE_CONVERSAR =
  'Oi Kauã, vim da Imersão e quero conversar antes de decidir sobre o W&W Protocol.';
export const WHATSAPP_MESSAGE_CADASTRO =
  'Oi Kauã, vim da Imersão e quero fazer meu cadastro no W&W Protocol.';

/** Builds a `wa.me` link with the message already URL-encoded in `text`. */
export function whatsappHref(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Datas da condição "quem esteve nas duas noites" (copy doc, S12/S17/S20),
 * ainda a definir a partir do evento de 28-29/10/2026 (pendência 2 do doc de
 * copy). Enquanto qualquer uma for `null`:
 *
 * - a página nunca imprime um colchete `[PRAZO DA CONDIÇÃO]` etc. pro
 *   visitante — as seções que dependem dela caem pra uma redação neutra, sem
 *   data nem número de vaga inventados (`condicaoPrazoTexto()` e as duas
 *   seções que a chamam);
 * - a página inteira fica `noindex` na metadata, a mesma regra que
 *   `/imersao` já aplicava a `IMERSAO_CHECKOUT_URL === null`.
 *
 * Preencher os três valores (e nada além deles) liga a copy definitiva e tira
 * o `noindex`.
 */
export const CONDICAO: {
  prazo: string | null;
  semanaOnboarding: string | null;
  proximaTurma: string | null;
} = {
  prazo: null,
  semanaOnboarding: null,
  proximaTurma: null,
};

/** `true` só quando as três datas da condição já foram preenchidas. Controla
 *  o `noindex` da página e serve de guarda pras seções que citam prazo. */
export const CONDICAO_RESOLVIDA =
  CONDICAO.prazo !== null && CONDICAO.semanaOnboarding !== null && CONDICAO.proximaTurma !== null;

/** Texto do bloco "condição de quem esteve nas duas noites" (S12). Neutro
 *  enquanto `CONDICAO_RESOLVIDA` for falso: nunca cita colchete, nunca inventa
 *  uma data. */
export function condicaoTexto(): string {
  if (CONDICAO.prazo && CONDICAO.semanaOnboarding) {
    return `Você já começou. Quem fechar até ${CONDICAO.prazo} tem o onboarding garantido na ${CONDICAO.semanaOnboarding}, e a semana da Hora Fixa que você está vivendo agora entra no seu período de diagnóstico. Você começa o Protocol com uma semana de dado já coletada.`;
  }
  return 'Você já começou. Quem fechar durante o período da condição da imersão tem o onboarding garantido logo na primeira turma depois do evento, e a semana da Hora Fixa que você está vivendo agora entra no seu período de diagnóstico. Você começa o Protocol com uma semana de dado já coletada.';
}

/** Rodapé do bloco de condição (S12). */
export function condicaoRodape(): string {
  if (CONDICAO.prazo) {
    return `Válida até ${CONDICAO.prazo}, só pra quem esteve na imersão. Depois disso o Protocol segue aberto, sem a condição.`;
  }
  return 'Só pra quem esteve na imersão. Fale comigo no WhatsApp pra saber o prazo. Depois dele o Protocol segue aberto, sem a condição.';
}

/** Texto da seção de vagas (S17), que cita a próxima turma. */
export function proximaTurmaTexto(): string {
  if (CONDICAO.proximaTurma) {
    return `Cada Weekly Report é lido e revisado por mim antes de ir pra você, porque é saúde de gente real. Por isso esta turma tem 10 vagas. Quando fecharem, a próxima turma abre em ${CONDICAO.proximaTurma}.`;
  }
  return 'Cada Weekly Report é lido e revisado por mim antes de ir pra você, porque é saúde de gente real. Por isso esta turma tem 10 vagas. Quando fecharem, fale comigo no WhatsApp pra saber quando a próxima turma abre.';
}

/** Texto (desktop) da barra fixa de rodapé (S20). */
export function stickyBarTextoDesktop(): string {
  if (CONDICAO.semanaOnboarding && CONDICAO.prazo) {
    return `W&W Protocol · onboarding garantido na ${CONDICAO.semanaOnboarding} pra quem fechar até ${CONDICAO.prazo}.`;
  }
  return 'W&W Protocol · onboarding garantido pra quem fechar durante a condição da imersão.';
}

/** Texto (mobile) da barra fixa de rodapé (S20). */
export function stickyBarTextoMobile(): string {
  if (CONDICAO.prazo) {
    return `Condição da imersão até ${CONDICAO.prazo}.`;
  }
  return 'Condição da imersão por tempo limitado.';
}

/**
 * Os visuais da página, cada grupo com a sua chave.
 *
 * - `VISUAIS_REPORTS`: duas páginas reais de Weekly Report ("Sua semana em
 *   detalhe"), anonimizadas (nome no rodapé e nome da equipe cobertos). Ligado
 *   em 24/09/2026: os dois alunos autorizaram pessoalmente ao Kauã.
 * - `VISUAIS_PLATAFORMA`: o print da área do aluno numa conta de demonstração.
 *   Desligado até a conta de demonstração existir; enquanto isso nenhum
 *   pedido por esse arquivo chega ao servidor.
 *
 * `tests/protocolo.test.ts` exige que todo arquivo atrás de uma chave ligada
 * exista em `public/photos/protocolo/`.
 */
export const VISUAIS_REPORTS = true;
export const VISUAIS_PLATAFORMA = false;

export type VisualProtocolo = {
  src: string;
  alt: string;
  caption: string;
  /** Proporção largura/altura da moldura, pra reservar o espaço sem layout shift. */
  aspect: string;
};

export const VISUAIS = {
  weeklyReport1: {
    src: '/photos/protocolo/weekly-report-1.jpg',
    alt: 'Página de um Weekly Report real, anonimizado: os oito pilares da semana, com nutrição contra a meta, treinos, recuperação, sono, hidratação e consistência da rotina',
    caption: 'Weekly Report real, anonimizado, com autorização do aluno.',
    aspect: '919 / 1300',
  },
  weeklyReport2: {
    src: '/photos/protocolo/weekly-report-2.jpg',
    alt: 'Página de outro Weekly Report real, anonimizado: os oito pilares da semana, com frequência cardíaca de repouso, sono e a leitura de cada indicador',
    caption: 'Weekly Report real, anonimizado, com autorização do aluno.',
    aspect: '919 / 1300',
  },
  plataforma: {
    src: '/photos/protocolo/plataforma.jpg',
    alt: 'Área do aluno na plataforma W&W, numa conta de demonstração, com as quatro prateleiras: Plano do Ciclo, Weekly Reports, materiais e contrato',
    caption: 'A sua área na plataforma W&W (conta de demonstração).',
    aspect: '16 / 10',
  },
} as const satisfies Record<string, VisualProtocolo>;
