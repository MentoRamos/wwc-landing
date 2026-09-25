/**
 * O pós-compra da Imersão Performance e Longevidade, decidido sem rede e sem
 * banco.
 *
 * Tudo que tem regra mora aqui: que mensagens um comprador recebe e quando,
 * o silêncio da noite, quem já tem a gravação, o telefone, o SAIR, a guarda
 * contra texto com marcador sobrando e o link pessoal da pesquisa. O webhook,
 * a fila e o worker só executam o que este arquivo decide, e é por isso que
 * cada caso difícil daqui tem teste com relógio fixo.
 *
 * Fonte: `Automação - Pós-compra e aquecimento (design v1, 24 set 2026).md`,
 * seções 3.1 e 3.4, e os textos de `Evento - Pós-compra do Ingresso`.
 *
 * Fuso: todo horário é de Brasília. O Brasil não tem horário de verão desde
 * 2019, então `-03:00` fixo é exato para as datas deste evento; o que depende
 * do dia civil passa por `civilDateISO`, o mesmo helper do resto do repo.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { civilDateISO } from './format.core';

export const EVENTO_EDITION_SLUG = 'imersao-2026-10';

/** Quarta 28/10/2026, 19h30 em Brasília: a sala abre e o ingresso fecha. */
export const EVENT_NIGHT_1 = new Date('2026-10-28T19:30:00-03:00');

/**
 * Quem comprou antes deste instante mantém a gravação sem custo.
 *
 * É o deploy de `f805e12` ("Replace included recording with replay deadline
 * on /imersao"), de 24/09/2026. O commit é de 14:12:35 -03:00 (limite
 * inferior). O deploy na Vercel (wwc-landing-ajqc1s5vi) foi criado às
 * 14:29:21 -03:00; o corte fica em 14:35 pra dar folga ao build e ao cache,
 * a favor de quem comprou.
 */
export const RECORDING_CUTOFF_AT = new Date('2026-09-24T17:35:00Z');

export const TICKET_PRODUCT_ID = 'ac3fc1c0-b78c-11f1-8ef9-6f8516a1cddf';
/** Gravação das duas noites, R$ 67, criada na Kiwify em 24/09. */
export const RECORDING_PRODUCT_ID = 'fab81ce0-b83a-11f1-b408-5b39c095d0ef';
/** Reserva (sinal) do Protocol, R$ 1.000, criada na Kiwify em 24/09. */
export const PROTOCOL_DEPOSIT_PRODUCT_ID = 'd99bbe80-b83b-11f1-abb1-f7fd368cb90a';
/** Protocol 180 e 90 dias: os mesmos de `lib/meta/conversion-products.ts`. */
export const PROTOCOL_PRODUCT_IDS: readonly string[] = [
  'a0361350-b793-11f1-a02f-752fbbcb4576',
  '496896f0-b794-11f1-b594-75596ac4e822',
];

export type EventoProductKind = 'ticket' | 'recording' | 'protocol_deposit' | 'protocol';

/**
 * Se o produto importa para o evento, e como.
 *
 * `testTicketIds` vem de `EVENTO_TEST_PRODUCT_IDS`: um "Ingresso TESTE"
 * oculto na Kiwify que percorre o mesmo caminho do ingresso, marcado como
 * sandbox para nunca se misturar com comprador de verdade.
 */
export function eventoProductKind(
  productId: string,
  testTicketIds: readonly string[] = [],
): { kind: EventoProductKind; sandbox: boolean } | undefined {
  const id = productId?.trim();
  if (!id) return undefined;
  if (id === TICKET_PRODUCT_ID) return { kind: 'ticket', sandbox: false };
  if (id === RECORDING_PRODUCT_ID) return { kind: 'recording', sandbox: false };
  if (id === PROTOCOL_DEPOSIT_PRODUCT_ID) return { kind: 'protocol_deposit', sandbox: false };
  if (PROTOCOL_PRODUCT_IDS.includes(id)) return { kind: 'protocol', sandbox: false };
  if (testTicketIds.includes(id)) return { kind: 'ticket', sandbox: true };
  return undefined;
}

export function includesRecording(purchasedAt: Date): boolean {
  return purchasedAt.getTime() < RECORDING_CUTOFF_AT.getTime();
}

// ------------------------------------------------------------------ agenda

export type Channel = 'email' | 'whatsapp';
export type PlannedJob = { channel: Channel; stepKey: string; dueAt: Date };

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const EVENT_DAY = '2026-10-28';

/** Os e-mails da contagem e das noites: horário fixo, igual para todo mundo. */
const EMAIL_SCHEDULE: ReadonlyArray<{ stepKey: string; at: string }> = [
  { stepKey: 'faltam7', at: '2026-10-21T08:00:00' },
  { stepKey: 'faltam5', at: '2026-10-23T08:00:00' },
  { stepKey: 'faltam3', at: '2026-10-25T09:00:00' },
  { stepKey: 'amanha', at: '2026-10-27T19:30:00' },
  { stepKey: 'hoje_n1', at: '2026-10-28T09:00:00' },
  { stepKey: 'falta1h_n1', at: '2026-10-28T18:30:00' },
  { stepKey: 'falta1h_n2', at: '2026-10-29T18:30:00' },
  { stepKey: 'fechamento', at: '2026-10-29T21:35:00' },
];

/**
 * Tudo que um comprador vai receber, com o horário de cada coisa.
 *
 * - T0 sai por e-mail e WhatsApp na hora da compra, a qualquer hora.
 * - No WhatsApp, +15 min (oferta da gravação, ou a mensagem de gravação
 *   incluída para quem comprou antes do corte), +3h (grupo), +6h (vídeos),
 *   respeitando o silêncio de 21h30 às 8h.
 * - Compra no dia 28/10: só T0 e o convite do grupo, juntos.
 * - Compra depois que a sala abriu: só a T0.
 * - Por e-mail, só os passos da contagem que ainda não passaram.
 *
 * As regras que mudam com o tempo (reembolso, SAIR, quem comprou o Protocol,
 * link do Meet configurado) não entram aqui: são conferidas na hora do
 * envio, porque o estado muda entre enfileirar e enviar.
 */
export function planJobs(input: { purchasedAt: Date; includesRecording: boolean }): PlannedJob[] {
  const { purchasedAt } = input;
  const base = purchasedAt.getTime();
  const jobs: PlannedJob[] = [
    { channel: 'email', stepKey: 't0', dueAt: purchasedAt },
    { channel: 'whatsapp', stepKey: 't0', dueAt: purchasedAt },
  ];

  if (base < EVENT_NIGHT_1.getTime()) {
    if (civilDateISO(purchasedAt) === EVENT_DAY) {
      jobs.push({ channel: 'whatsapp', stepKey: 'grupo_convite', dueAt: quietHoursAdjust(purchasedAt, 0) });
    } else {
      const sequence = [
        { stepKey: input.includesRecording ? 'gravacao_incluida' : 'gravacao_oferta', offset: 15 * MINUTE },
        { stepKey: 'grupo_convite', offset: 3 * HOUR },
        { stepKey: 'videos', offset: 6 * HOUR },
      ];
      // Um passo adiado pelo silêncio vai para 8h30+; o seguinte, que caiu
      // fora do silêncio (compra às 02h10: vídeos às 08h10), passaria na
      // frente. Cada passo sai pelo menos 15 min depois do anterior.
      let previous: number | undefined;
      sequence.forEach((step, position) => {
        const adjusted = quietHoursAdjust(new Date(base + step.offset), position).getTime();
        const due = previous === undefined ? adjusted : Math.max(adjusted, previous + 15 * MINUTE);
        previous = due;
        jobs.push({ channel: 'whatsapp', stepKey: step.stepKey, dueAt: new Date(due) });
      });
    }
  }

  for (const step of EMAIL_SCHEDULE) {
    const dueAt = new Date(`${step.at}-03:00`);
    if (dueAt.getTime() > base) jobs.push({ channel: 'email', stepKey: step.stepKey, dueAt });
  }

  return jobs;
}

/**
 * A agenda de quem comprou antes da automação existir (backfill). Uma
 * mensagem única agora (`t0` por e-mail, `t0_antigos` no WhatsApp) e, do
 * resto da agenda normal, só o que ainda não venceu: a oferta da gravação, o
 * convite e os vídeos atrasados não saem todos de uma vez, e a contagem que
 * já passou não sai fora de hora.
 */
export function planBackfillJobs(input: { purchasedAt: Date; includesRecording: boolean; now: Date }): PlannedJob[] {
  const now = input.now.getTime();
  const jobs: PlannedJob[] = [
    { channel: 'email', stepKey: 't0', dueAt: input.now },
    { channel: 'whatsapp', stepKey: 't0_antigos', dueAt: input.now },
  ];
  for (const job of planJobs(input)) {
    if (job.stepKey === 't0') continue;
    if (job.dueAt.getTime() > now) jobs.push(job);
  }
  return jobs;
}

/** Minutos desde a meia-noite, no relógio de Brasília. */
function localMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

const QUIET_START = 21 * 60 + 30;
const QUIET_END = 8 * 60;

export function isQuietHour(date: Date): boolean {
  const minutes = localMinutes(date);
  return minutes >= QUIET_START || minutes < QUIET_END;
}

/**
 * O passo que cai no silêncio sai às 8h30 da manhã seguinte, mais 15 minutos
 * por posição na sequência do comprador. A posição é fixa (gravação 0, grupo
 * 1, vídeos 2), e não a ordem entre os adiados: é o que garante a mesma ordem
 * e o intervalo de 15 minutos sem depender de quais passos caíram no silêncio.
 */
export function quietHoursAdjust(due: Date, position: number): Date {
  if (!isQuietHour(due)) return due;
  const minutes = localMinutes(due);
  const day = new Date(`${civilDateISO(due)}T08:30:00-03:00`);
  const morning = minutes >= QUIET_START ? day.getTime() + 24 * HOUR : day.getTime();
  return new Date(morning + position * 15 * MINUTE);
}

export type T0Variant = 'padrao' | 'tarefa' | 'iniciado';

/**
 * A T0 de quem compra entre 21/10 e 27/10 ganha uma linha sobre a tarefa de
 * 7 dias, que já começou. Quem tem a compra aprovada depois que a sala abriu
 * (Pix ou boleto que compensou tarde) recebe a variação `iniciado`: o evento
 * já começou e o replay fica no grupo até domingo 01/11, no lugar de "Nos
 * vemos no dia 28".
 */
export function t0Variant(purchasedAt: Date): T0Variant {
  if (purchasedAt.getTime() >= EVENT_NIGHT_1.getTime()) return 'iniciado';
  const day = civilDateISO(purchasedAt);
  return day >= '2026-10-21' && day <= '2026-10-27' ? 'tarefa' : 'padrao';
}

// ------------------------------------------------------------------ telefone

/** DDDs em uso no Brasil (Anatel). */
const BR_DDD: ReadonlySet<string> = new Set(
  (
    '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 ' +
    '51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 ' +
    '91 92 93 94 95 96 97 98 99'
  ).split(' '),
);

/**
 * O telefone em E.164, ou null.
 *
 * Aceita o que a Kiwify manda de verdade: com ou sem +55, com máscara, com ou
 * sem o nono dígito. Sem o nono dígito fica como veio: quem decide o JID
 * certo é a Evolution (`whatsappNumbers`), não um palpite nosso. Número com +
 * e outro código de país passa como está, porque a pessoa pode morar fora.
 */
export function normalizeBrPhone(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? '';
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  const international = value.startsWith('+');

  let national: string | undefined;
  if (international) {
    if (!digits.startsWith('55')) {
      return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
    }
    national = digits.slice(2);
  } else if (digits.length === 10 || digits.length === 11) {
    national = digits;
  } else if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    national = digits.slice(2);
  }

  if (!national || (national.length !== 10 && national.length !== 11)) return null;
  if (!BR_DDD.has(national.slice(0, 2))) return null;
  if (national.length === 11 && national[2] !== '9') return null;
  return `+55${national}`;
}

// ------------------------------------------------------------------ SAIR

/**
 * "SAIR" em resposta a uma mensagem individual.
 *
 * Sem acento, sem pontuação, sem emoji, caixa baixa, até 3 palavras, e a
 * primeira precisa ser exatamente "sair". "vou sair mais cedo" é conversa,
 * não pedido de saída, e tratar como saída tiraria da lista quem só estava
 * avisando que chega atrasado.
 */
export function isOptOutReply(text: string | null | undefined): boolean {
  const words = (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.length > 0 && words.length <= 3 && words[0] === 'sair';
}

// ------------------------------------------------------------------ texto

/**
 * Nenhum texto com marcador sobrando sai: `[LINK DA PESQUISA]`, `[PREÇO]`,
 * `[Primeiro Nome]`, `[KAUÃ CONFERE ...]`. Um colchete que abre com letra e
 * tem pelo menos três caracteres é marcador; `[1]` não é.
 */
export function hasPlaceholder(text: string): boolean {
  return /\[(?:LINK|PRE[ÇC]O)/i.test(text) || /\[\p{L}[^\]]{2,}\]/u.test(text);
}

/** `joão` vira `João`, `MARIA CLARA` vira `Maria`. Sem letra, sem nome. */
export function displayFirstName(raw: string | null | undefined): string | null {
  const first = raw?.trim().split(/\s+/)[0] ?? '';
  if (!/\p{L}/u.test(first)) return null;
  const lower = first.toLocaleLowerCase('pt-BR');
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
}

// ------------------------------------------------------------------ link pessoal

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_PURPOSE = 'evento-pesquisa:';

function mac(buyerId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${TOKEN_PURPOSE}${buyerId.toLowerCase()}`).digest('base64url').slice(0, 32);
}

/**
 * `t=<buyer_id>.<hmac>`: o link da pesquisa identifica o comprador sem levar
 * e-mail nem telefone na URL (URL vai para log de CDN, histórico e analytics).
 */
export function signLinkToken(buyerId: string, secret: string): string {
  if (!secret) throw new Error('EVENTO_LINK_SECRET ausente');
  return `${buyerId.toLowerCase()}.${mac(buyerId, secret)}`;
}

export function verifyLinkToken(token: string | null | undefined, secret: string | null | undefined): string | null {
  if (!token || !secret) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const buyerId = token.slice(0, dot);
  const given = token.slice(dot + 1);
  if (!UUID.test(buyerId)) return null;
  // Compara bytes, não caracteres: `timingSafeEqual` lança com buffers de
  // tamanhos diferentes, e 32 caracteres multibyte têm mais de 32 bytes.
  const givenBytes = Buffer.from(given, 'utf8');
  const expectedBytes = Buffer.from(mac(buyerId, secret), 'utf8');
  if (givenBytes.length !== expectedBytes.length) return null;
  return timingSafeEqual(givenBytes, expectedBytes) ? buyerId.toLowerCase() : null;
}

// ------------------------------------------------------------------ sandbox

/**
 * Para quem o e-mail vai de verdade, ou null para não enviar agora.
 *
 * - Comprador de teste (produto de `EVENTO_TEST_PRODUCT_IDS`, `source =
 *   'sandbox'`): sempre para o primeiro endereço de
 *   `EVENTO_SANDBOX_ALLOWLIST`, nunca para o endereço da compra.
 * - Comprador de verdade: só com `EVENTO_MODE=live`. Qualquer outro valor,
 *   inclusive a variável ausente, devolve null e o job continua pendente.
 *
 * Fechado por padrão: esquecer a variável não dispara e-mail para cliente.
 * E o comprador real nunca é desviado para a allowlist, porque aí o job
 * ficaria como enviado e a pessoa nunca receberia a confirmação depois.
 */
export function resolveRecipient(input: {
  mode: string | undefined;
  allowlist: readonly string[];
  email: string;
  sandboxBuyer: boolean;
}): string | null {
  if (input.sandboxBuyer) return input.allowlist.find((address) => address.trim())?.trim() ?? null;
  return input.mode?.trim().toLowerCase() === 'live' ? input.email : null;
}

// ------------------------------------------------------------------ webhook

export type EventoAction =
  | { op: 'register'; sandbox: boolean }
  | { op: 'cancel'; status: 'refunded' | 'chargeback' }
  | { op: 'mark'; kind: 'recording' | 'protocol_deposit' | 'protocol' }
  | { op: 'ignore'; reason: string };

/**
 * O que o webhook deve fazer com um evento da Kiwify, do ponto de vista do
 * evento. Só a compra aprovada do ingresso cria comprador, e só o reembolso
 * ou o chargeback do ingresso cancela. A gravação, a reserva e o Protocol
 * aprovados marcam o comprador e não liberam nada na plataforma. Reembolso
 * desses três fica de fora no Marco 1 (o billing_events guarda o evento).
 */
export function eventoAction(
  event: { type: string; productId: string; email: string },
  testTicketIds: readonly string[] = [],
): EventoAction {
  const product = eventoProductKind(event.productId, testTicketIds);
  if (!product) return { op: 'ignore', reason: 'produto-fora-do-evento' };
  if (!event.email?.trim()) return { op: 'ignore', reason: 'sem-email' };

  if (product.kind === 'ticket') {
    if (event.type === 'order_approved') return { op: 'register', sandbox: product.sandbox };
    if (event.type === 'order_refunded') return { op: 'cancel', status: 'refunded' };
    if (event.type === 'chargeback') return { op: 'cancel', status: 'chargeback' };
    return { op: 'ignore', reason: `evento:${event.type}` };
  }

  if (event.type === 'order_approved') return { op: 'mark', kind: product.kind };
  return { op: 'ignore', reason: `evento:${event.type}` };
}
