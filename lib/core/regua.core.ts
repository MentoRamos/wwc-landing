import { civilDateISO } from './format.core';

/**
 * A régua de e-mails do Circle, decidida sem banco e sem rede.
 *
 * Espelha o desenho que já roda em produção no funil (`regua.core.js`), e as
 * três regras que ele provou valem aqui inteiras:
 *
 * 1. **Um passo por tick.** Quem assinou há 100 dias não leva o atraso inteiro
 *    na cara: recebe o primeiro que falta e só ele.
 * 2. **Marca depois de enviar.** Marcar antes e falhar o envio faz a pessoa
 *    perder o passo para sempre.
 * 3. **Nada de I/O aqui.** Quem envia e quem grava são do chamador, então todo
 *    caso difícil desta régua é testável sem subir nada.
 */
export type Member = {
  email_norm: string;
  email_raw: string;
  first_name: string | null;
  /** Quando a assinatura começou. É daqui que contam os 30 e os 90 dias. */
  started_at: string;
  expires_at: string | null;
  status: string;
};

export type Step = {
  key: string;
  /** Dias desde o início da assinatura. A véspera não usa isto. */
  afterDays: number;
  subject: string;
  body: (name: string, meeting: Date) => string;
};

export type Rendered = { key: string; subject: string; html: string };

const MS_DAY = 86_400_000;
const LIVE_STATUS = ['active', 'past_due'];

/** Escapa antes de interpolar. O nome vem do Google e é texto de terceiro. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function civilDay(value: Date): number {
  const [year, month, day] = civilDateISO(value).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

const daysBetween = (from: Date, to: Date) => Math.round((civilDay(to) - civilDay(from)) / MS_DAY);

/** `meeting_2026-09-17`. A data na chave é o que faz cada quinta ser um envio novo. */
export function meetingKey(meeting: Date): string {
  return `meeting_${civilDateISO(meeting)}`;
}

// ------------------------------------------------------------------ o layout

const P = (text: string) =>
  `<p style="font-size:15px;line-height:1.75;color:#CFCDC6;margin:0 0 18px">${text}</p>`;
const H = (text: string) =>
  `<h1 style="font-size:26px;font-weight:400;line-height:1.3;color:#EAE7E1;margin:0 0 20px">${text}</h1>`;
const BTN = (href: string, label: string) =>
  `<p style="margin:28px 0"><a href="${href}" style="display:inline-block;background:#C9A84C;color:#0D0D0D;text-decoration:none;padding:14px 28px;font-size:14px;letter-spacing:.08em;text-transform:uppercase">${label}</a></p>`;

const SITE = 'https://kauaramos.com';

function layout(body: string): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#0D0D0D;color:#EAE7E1;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#C9A84C;margin:0 0 24px">W&amp;W Circle</p>
    ${body}
    <p style="font-size:14px;line-height:1.7;color:#CFCDC6;margin:28px 0 0">Kauã Ramos</p>
    <p style="font-size:12px;color:#6b6b6b;margin:4px 0 0">Health Manager · Longevidade &amp; Performance</p>
    <p style="font-size:11px;color:#6b6b6b;margin:24px 0 0">Você recebe isto porque assina o W&amp;W Circle. Para parar, responda este e-mail.</p>
  </div>
</body></html>`;
}

/** Quinta-feira por extenso, em São Paulo: "quinta, 17 de setembro". */
function meetingLabel(meeting: Date): string {
  return meeting.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// ------------------------------------------------------------------ os passos

export const STEPS: Step[] = [
  {
    key: 'welcome',
    afterDays: 0,
    subject: 'Você está dentro do Circle',
    body: (name, meeting) =>
      H(`${name}, bem-vindo.`) +
      P(
        'O Circle é uma hora por semana sobre os seus próprios números. Toda quinta, 20h, no Google Meet, com espaço para a sua pergunta.',
      ) +
      P(`O próximo encontro é ${meetingLabel(meeting)}. O link fica na sua área.`) +
      P(
        'A biblioteca já está liberada: as gravações dos encontros anteriores e os guias em PDF. Comece por onde a sua semana estiver mais apertada.',
      ) +
      BTN(`${SITE}/inicio`, 'Abrir a sua área'),
  },
  {
    key: 'month_1',
    afterDays: 30,
    subject: 'Um mês de Circle: o que mudou aí?',
    body: (name) =>
      H(`${name}, faz um mês.`) +
      P(
        'Tempo suficiente para um hábito começar a aparecer e curto demais para ele estar firme. É exatamente aqui que a maioria para, e não por falta de informação.',
      ) +
      P(
        'Uma pergunta só, e vale responder este e-mail com a resposta: o que você fez nas últimas quatro semanas que não fazia antes?',
      ) +
      P(
        'Se a resposta for "nada", não é fracasso. É dado. Me conta e a gente ajusta o que está sendo pedido de você.',
      ) +
      BTN(`${SITE}/biblioteca`, 'Ver a biblioteca'),
  },
  {
    key: 'month_3',
    afterDays: 90,
    subject: 'Três meses: a hora de olhar para trás',
    body: (name) =>
      H(`${name}, três meses.`) +
      P(
        'É o primeiro prazo em que um número se mexe de verdade. Sono, composição corporal, disposição no fim da tarde: nada disso responde em duas semanas, mas responde em doze.',
      ) +
      P(
        'Se você mede alguma coisa, compare com o que media em quando entrou. Se não mede nada ainda, este é o melhor dia para começar, porque daqui a três meses você vai querer ter começado hoje.',
      ) +
      P('E se quiser olhar isso comigo, com os seus dados na frente, responda este e-mail.') +
      BTN(`${SITE}/inicio`, 'Abrir a sua área'),
  },
];

/** A véspera. Não está em STEPS porque não conta dias desde a assinatura. */
const EVE: Omit<Step, 'key' | 'afterDays'> = {
  subject: 'Amanhã, 20h: o encontro da semana',
  body: (name, meeting) =>
    H(`${name}, é amanhã.`) +
    P(`${capitalize(meetingLabel(meeting))}, 20h, no Google Meet.`) +
    P(
      'Se tiver uma pergunta, leve ela pronta. A hora rende muito mais quando alguém abre com um caso concreto em vez de esperar para ver no que dá.',
    ) +
    P('Não vai dar para estar? A gravação entra na biblioteca depois.') +
    BTN(`${SITE}/circle`, 'Ver o encontro'),
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// ------------------------------------------------------------------ a decisão

function isLive(member: Member, now: Date): boolean {
  if (!LIVE_STATUS.includes(member.status)) return false;
  // Cancelar vale até o fim do período já pago: enquanto a data não chegou, a
  // pessoa é membro e recebe, porque é o que ela pagou.
  if (member.expires_at && new Date(member.expires_at) <= now) return false;
  return true;
}

/**
 * O próximo e-mail desta pessoa, ou nada.
 *
 * A véspera ganha do perene quando os dois caem no mesmo tick, e a razão é que
 * ela é a única que estraga: perdida a véspera, mandar depois não serve para
 * nada. O e-mail de mês 1 serve em qualquer dia.
 */
export function dueFor(
  member: Member,
  sent: ReadonlySet<string>,
  now: Date,
  nextMeeting: Date,
): Step | null {
  if (!isLive(member, now)) return null;

  const eveKey = meetingKey(nextMeeting);
  if (!sent.has(eveKey) && daysBetween(now, nextMeeting) === 1) {
    return { key: eveKey, afterDays: 0, ...EVE };
  }

  const started = new Date(member.started_at);
  const age = daysBetween(started, now);

  // Um por tick: o primeiro que falta e cuja data já passou.
  for (const step of STEPS) {
    if (sent.has(step.key)) continue;
    if (age < step.afterDays) return null;
    return step;
  }

  return null;
}

export function renderStep(step: Step, member: Member, meeting: Date): Rendered {
  const name = escapeHtml((member.first_name ?? '').trim()) || 'por aí';
  return { key: step.key, subject: step.subject, html: layout(step.body(name, meeting)) };
}
