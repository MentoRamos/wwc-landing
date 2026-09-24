import { describe, expect, it } from 'vitest';
import {
  EVENT_NIGHT_1,
  PROTOCOL_DEPOSIT_PRODUCT_ID,
  RECORDING_CUTOFF_AT,
  RECORDING_PRODUCT_ID,
  TICKET_PRODUCT_ID,
  displayFirstName,
  eventoAction,
  eventoProductKind,
  hasPlaceholder,
  includesRecording,
  isOptOutReply,
  isQuietHour,
  normalizeBrPhone,
  planJobs,
  quietHoursAdjust,
  resolveRecipient,
  signLinkToken,
  t0Variant,
  verifyLinkToken,
  type PlannedJob,
} from '@/lib/core/evento.core';

/**
 * O núcleo do pós-compra da Imersão, sem rede e sem banco.
 *
 * Todo horário aqui é de Brasília (-03:00, sem horário de verão desde 2019).
 * O servidor da Vercel roda em UTC, então um teste que só passasse no fuso da
 * máquina de quem escreveu seria pior que nenhum: as datas vão escritas com
 * offset explícito.
 */
const at = (local: string) => new Date(`${local}-03:00`);
const iso = (local: string) => at(local).toISOString();

function byKey(jobs: PlannedJob[]) {
  return Object.fromEntries(jobs.map((job) => [`${job.channel}:${job.stepKey}`, job.dueAt.toISOString()]));
}

describe('a gravação incluída', () => {
  it('vale para quem comprou antes do corte e não para quem comprou depois', () => {
    expect(includesRecording(new Date(RECORDING_CUTOFF_AT.getTime() - 1))).toBe(true);
    expect(includesRecording(RECORDING_CUTOFF_AT)).toBe(false);
    expect(includesRecording(at('2026-09-23T20:00:00'))).toBe(true);
    expect(includesRecording(at('2026-10-01T10:00:00'))).toBe(false);
  });

  /**
   * O corte é o deploy que tirou a gravação da página (`f805e12`). O commit
   * é de 24/09 14:12:35 -03:00, então o corte nunca pode ser antes disso:
   * quem comprou vendo "a gravação fica com você" tem que manter a gravação.
   */
  it('não é anterior ao commit que trocou a promessa', () => {
    expect(RECORDING_CUTOFF_AT.getTime()).toBeGreaterThanOrEqual(Date.parse('2026-09-24T14:12:35-03:00'));
    expect(RECORDING_CUTOFF_AT.toISOString().slice(0, 10)).toBe('2026-09-24');
  });
});

describe('os produtos do evento', () => {
  it('reconhece o ingresso, a gravação, a reserva e o Protocol', () => {
    expect(eventoProductKind(TICKET_PRODUCT_ID)).toEqual({ kind: 'ticket', sandbox: false });
    expect(eventoProductKind(RECORDING_PRODUCT_ID)).toEqual({ kind: 'recording', sandbox: false });
    expect(eventoProductKind(PROTOCOL_DEPOSIT_PRODUCT_ID)).toEqual({ kind: 'protocol_deposit', sandbox: false });
    expect(eventoProductKind('a0361350-b793-11f1-a02f-752fbbcb4576')).toEqual({ kind: 'protocol', sandbox: false });
    expect(eventoProductKind('496896f0-b794-11f1-b594-75596ac4e822')).toEqual({ kind: 'protocol', sandbox: false });
  });

  it('usa os ids que o Kauã criou na Kiwify em 24/09', () => {
    expect(TICKET_PRODUCT_ID).toBe('ac3fc1c0-b78c-11f1-8ef9-6f8516a1cddf');
    expect(RECORDING_PRODUCT_ID).toBe('fab81ce0-b83a-11f1-b408-5b39c095d0ef');
    expect(PROTOCOL_DEPOSIT_PRODUCT_ID).toBe('d99bbe80-b83b-11f1-abb1-f7fd368cb90a');
  });

  it('trata o produto de teste como ingresso de sandbox', () => {
    expect(eventoProductKind('teste-1', ['teste-1'])).toEqual({ kind: 'ticket', sandbox: true });
  });

  it('ignora o resto, inclusive o Circle', () => {
    expect(eventoProductKind('qualquer')).toBeUndefined();
    expect(eventoProductKind('')).toBeUndefined();
    expect(eventoProductKind('toString')).toBeUndefined();
  });
});

describe('o silêncio de 21h30 às 8h', () => {
  it('começa às 21h30 e termina às 8h', () => {
    expect(isQuietHour(at('2026-10-05T21:29:59'))).toBe(false);
    expect(isQuietHour(at('2026-10-05T21:30:00'))).toBe(true);
    expect(isQuietHour(at('2026-10-06T03:00:00'))).toBe(true);
    expect(isQuietHour(at('2026-10-06T07:59:59'))).toBe(true);
    expect(isQuietHour(at('2026-10-06T08:00:00'))).toBe(false);
  });

  it('empurra para 8h30 do dia seguinte, 15 minutos por posição', () => {
    expect(quietHoursAdjust(at('2026-10-05T22:00:00'), 0).toISOString()).toBe(iso('2026-10-06T08:30:00'));
    expect(quietHoursAdjust(at('2026-10-05T23:59:00'), 1).toISOString()).toBe(iso('2026-10-06T08:45:00'));
    expect(quietHoursAdjust(at('2026-10-06T02:00:00'), 2).toISOString()).toBe(iso('2026-10-06T09:00:00'));
  });

  it('não mexe no que está fora do silêncio', () => {
    const due = at('2026-10-05T21:15:00');
    expect(quietHoursAdjust(due, 2)).toEqual(due);
  });

  /** O servidor roda em UTC: 00h30 UTC é 21h30 do dia anterior em Brasília. */
  it('decide pelo relógio de Brasília, não pelo do servidor', () => {
    expect(isQuietHour(new Date('2026-10-06T00:30:00Z'))).toBe(true);
    expect(isQuietHour(new Date('2026-10-06T12:00:00Z'))).toBe(false);
  });
});

describe('a agenda de um comprador', () => {
  it('compra às 10h: T0 agora, gravação +15 min, grupo +3h, vídeos +6h, e a contagem por e-mail', () => {
    const jobs = byKey(planJobs({ purchasedAt: at('2026-10-05T10:00:00'), includesRecording: false }));
    expect(jobs).toEqual({
      'email:t0': iso('2026-10-05T10:00:00'),
      'whatsapp:t0': iso('2026-10-05T10:00:00'),
      'whatsapp:gravacao_oferta': iso('2026-10-05T10:15:00'),
      'whatsapp:grupo_convite': iso('2026-10-05T13:00:00'),
      'whatsapp:videos': iso('2026-10-05T16:00:00'),
      'email:faltam7': iso('2026-10-21T08:00:00'),
      'email:faltam5': iso('2026-10-23T08:00:00'),
      'email:faltam3': iso('2026-10-25T09:00:00'),
      'email:amanha': iso('2026-10-27T19:30:00'),
      'email:hoje_n1': iso('2026-10-28T09:00:00'),
      'email:falta1h_n1': iso('2026-10-28T18:30:00'),
      'email:falta1h_n2': iso('2026-10-29T18:30:00'),
      'email:fechamento': iso('2026-10-29T21:35:00'),
    });
  });

  it('compra às 21h20: T0 sai na hora, o resto vai para 8h30, 8h45 e 9h00', () => {
    const jobs = byKey(planJobs({ purchasedAt: at('2026-10-05T21:20:00'), includesRecording: false }));
    expect(jobs['whatsapp:t0']).toBe(iso('2026-10-05T21:20:00'));
    expect(jobs['email:t0']).toBe(iso('2026-10-05T21:20:00'));
    expect(jobs['whatsapp:gravacao_oferta']).toBe(iso('2026-10-06T08:30:00'));
    expect(jobs['whatsapp:grupo_convite']).toBe(iso('2026-10-06T08:45:00'));
    expect(jobs['whatsapp:videos']).toBe(iso('2026-10-06T09:00:00'));
  });

  it('compra às 21h: a gravação ainda sai 21h15, e o resto na manhã seguinte em ordem', () => {
    const jobs = byKey(planJobs({ purchasedAt: at('2026-10-05T21:00:00'), includesRecording: false }));
    expect(jobs['whatsapp:gravacao_oferta']).toBe(iso('2026-10-05T21:15:00'));
    expect(jobs['whatsapp:grupo_convite']).toBe(iso('2026-10-06T08:45:00'));
    expect(jobs['whatsapp:videos']).toBe(iso('2026-10-06T09:00:00'));
  });

  it('compra de madrugada: a T0 sai mesmo no silêncio, porque é confirmação', () => {
    const jobs = byKey(planJobs({ purchasedAt: at('2026-10-06T02:00:00'), includesRecording: false }));
    expect(jobs['whatsapp:t0']).toBe(iso('2026-10-06T02:00:00'));
    expect(jobs['whatsapp:gravacao_oferta']).toBe(iso('2026-10-06T08:30:00'));
  });

  it('quem já tem a gravação recebe a mensagem de gravação incluída no lugar da oferta', () => {
    const jobs = byKey(planJobs({ purchasedAt: at('2026-09-23T20:00:00'), includesRecording: true }));
    expect(jobs['whatsapp:gravacao_oferta']).toBeUndefined();
    expect(jobs['whatsapp:gravacao_incluida']).toBe(iso('2026-09-23T20:15:00'));
  });

  it('compra entre 21/10 e 27/10 perde a contagem que já passou', () => {
    const jobs = byKey(planJobs({ purchasedAt: at('2026-10-22T10:00:00'), includesRecording: false }));
    expect(jobs['email:faltam7']).toBeUndefined();
    expect(jobs['email:faltam5']).toBe(iso('2026-10-23T08:00:00'));
    expect(jobs['whatsapp:videos']).toBe(iso('2026-10-22T16:00:00'));
  });

  it('compra na quarta 28/10: só T0 e convite do grupo, juntos, sem oferta e sem vídeos', () => {
    const jobs = byKey(planJobs({ purchasedAt: at('2026-10-28T15:00:00'), includesRecording: false }));
    const whatsapp = Object.keys(jobs).filter((key) => key.startsWith('whatsapp:'));
    expect(whatsapp.sort()).toEqual(['whatsapp:grupo_convite', 'whatsapp:t0']);
    expect(jobs['whatsapp:grupo_convite']).toBe(iso('2026-10-28T15:00:00'));
    expect(jobs['email:hoje_n1']).toBeUndefined();
    expect(jobs['email:falta1h_n1']).toBe(iso('2026-10-28T18:30:00'));
  });

  it('compra depois que a sala abriu: só a confirmação e o que ainda vem pela frente', () => {
    const jobs = byKey(planJobs({ purchasedAt: at('2026-10-29T10:00:00'), includesRecording: false }));
    expect(Object.keys(jobs).sort()).toEqual([
      'email:falta1h_n2',
      'email:fechamento',
      'email:t0',
      'whatsapp:t0',
    ]);
  });

  it('não repete passo: cada (canal, passo) aparece uma vez', () => {
    const jobs = planJobs({ purchasedAt: at('2026-10-05T10:00:00'), includesRecording: false });
    const keys = jobs.map((job) => `${job.channel}:${job.stepKey}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('a noite 1 é quarta 28/10 às 19h30 de Brasília', () => {
    expect(EVENT_NIGHT_1.toISOString()).toBe('2026-10-28T22:30:00.000Z');
  });
});

describe('a variação da T0', () => {
  it('ganha a linha da tarefa só para compra entre 21/10 e 27/10', () => {
    expect(t0Variant(at('2026-10-20T23:59:00'))).toBe('padrao');
    expect(t0Variant(at('2026-10-21T00:00:00'))).toBe('tarefa');
    expect(t0Variant(at('2026-10-27T23:59:00'))).toBe('tarefa');
    expect(t0Variant(at('2026-10-28T08:00:00'))).toBe('padrao');
  });
});

describe('o telefone brasileiro', () => {
  it('normaliza para E.164, com e sem +55, com e sem máscara', () => {
    expect(normalizeBrPhone('+55 (11) 98765-4321')).toBe('+5511987654321');
    expect(normalizeBrPhone('11987654321')).toBe('+5511987654321');
    expect(normalizeBrPhone('5511987654321')).toBe('+5511987654321');
    expect(normalizeBrPhone('(21) 99876-5432')).toBe('+5521998765432');
  });

  it('aceita o número sem o nono dígito (a Evolution resolve o JID depois)', () => {
    expect(normalizeBrPhone('1187654321')).toBe('+551187654321');
    expect(normalizeBrPhone('+55 11 8765-4321')).toBe('+551187654321');
  });

  it('recusa DDD que não existe', () => {
    expect(normalizeBrPhone('00987654321')).toBeNull();
    expect(normalizeBrPhone('20987654321')).toBeNull();
    expect(normalizeBrPhone('+55 (10) 98765-4321')).toBeNull();
  });

  it('recusa celular de 11 dígitos que não começa com 9', () => {
    expect(normalizeBrPhone('11887654321')).toBeNull();
  });

  it('mantém número estrangeiro que veio com +', () => {
    expect(normalizeBrPhone('+1 (305) 555-1234')).toBe('+13055551234');
    expect(normalizeBrPhone('+351 912 345 678')).toBe('+351912345678');
  });

  it('devolve null para vazio, curto demais ou lixo', () => {
    expect(normalizeBrPhone(undefined)).toBeNull();
    expect(normalizeBrPhone('')).toBeNull();
    expect(normalizeBrPhone('12345')).toBeNull();
    expect(normalizeBrPhone('telefone')).toBeNull();
  });
});

describe('o SAIR', () => {
  it('aceita as formas que alguém escreve de verdade', () => {
    for (const text of ['SAIR', 'sair', 'Sair.', 'SAIR 🙏', ' sair! ', 'Sair por favor', 'sáir']) {
      expect(isOptOutReply(text), text).toBe(true);
    }
  });

  it('recusa frase que só contém a palavra', () => {
    for (const text of ['saíram', 'vou sair mais cedo', 'quero sair', 'sair daqui agora mesmo', 'sairei', '', '🙏']) {
      expect(isOptOutReply(text), text).toBe(false);
    }
  });
});

describe('a guarda de placeholder', () => {
  it('pega os marcadores dos textos-base', () => {
    for (const text of [
      'veja [LINK DA PESQUISA]',
      'custa [PREÇO]',
      'Olá [Primeiro Nome], tudo bem',
      'link: [LINK DOS VÍDEOS]',
      '[KAUÃ CONFERE a divisão por aparelho]',
      'em [NOVA DATA DA LIVE DO CIRCLE]',
    ]) {
      expect(hasPlaceholder(text), text).toBe(true);
    }
  });

  it('deixa passar texto pronto', () => {
    expect(hasPlaceholder('Maria, aqui é o Kauã Ramos. O link é https://kauaramos.com/imersao/pesquisa?t=abc')).toBe(
      false,
    );
    expect(hasPlaceholder('nota [1] de rodapé')).toBe(false);
  });
});

describe('o primeiro nome que vai na mensagem', () => {
  it('capitaliza sem gritar', () => {
    expect(displayFirstName('joão')).toBe('João');
    expect(displayFirstName('MARIA CLARA')).toBe('Maria');
    expect(displayFirstName('  ana  ')).toBe('Ana');
  });

  it('não devolve nada útil para vazio ou lixo', () => {
    expect(displayFirstName(undefined)).toBeNull();
    expect(displayFirstName('   ')).toBeNull();
    expect(displayFirstName('123')).toBeNull();
  });
});

describe('o link pessoal da pesquisa', () => {
  const secret = 'segredo-de-teste-com-bastante-entropia';
  const buyerId = '11111111-2222-3333-4444-555555555555';

  it('volta o comprador quando o token é o que nós assinamos', () => {
    expect(verifyLinkToken(signLinkToken(buyerId, secret), secret)).toBe(buyerId);
  });

  it('nunca carrega o e-mail nem o telefone', () => {
    const token = signLinkToken(buyerId, secret);
    expect(token).not.toMatch(/@/);
    expect(token.startsWith(buyerId)).toBe(true);
  });

  it('recusa token adulterado, de outro segredo, truncado ou vazio', () => {
    const token = signLinkToken(buyerId, secret);
    const outro = '99999999-2222-3333-4444-555555555555';
    expect(verifyLinkToken(`${outro}${token.slice(buyerId.length)}`, secret)).toBeNull();
    expect(verifyLinkToken(signLinkToken(buyerId, 'outro-segredo'), secret)).toBeNull();
    expect(verifyLinkToken(token.slice(0, -3), secret)).toBeNull();
    expect(verifyLinkToken('', secret)).toBeNull();
    expect(verifyLinkToken(undefined, secret)).toBeNull();
    expect(verifyLinkToken('nao-e-uuid.abc', secret)).toBeNull();
  });

  it('sem segredo configurado, nada é válido', () => {
    expect(verifyLinkToken(signLinkToken(buyerId, secret), '')).toBeNull();
    expect(() => signLinkToken(buyerId, '')).toThrow();
  });
});

describe('o destinatário do e-mail', () => {
  it('em live vai para quem comprou', () => {
    expect(resolveRecipient({ mode: 'live', allowlist: [], email: 'a@x.com' })).toBe('a@x.com');
  });

  it('em sandbox vai para a allowlist, nunca para o comprador', () => {
    expect(resolveRecipient({ mode: 'sandbox', allowlist: ['kaua@x.com'], email: 'a@x.com' })).toBe('kaua@x.com');
  });

  it('em sandbox sem allowlist não vai para ninguém', () => {
    expect(resolveRecipient({ mode: 'sandbox', allowlist: [], email: 'a@x.com' })).toBeNull();
  });

  it('qualquer modo desconhecido ou ausente é sandbox', () => {
    expect(resolveRecipient({ mode: undefined, allowlist: [], email: 'a@x.com' })).toBeNull();
    expect(resolveRecipient({ mode: 'LIVE ', allowlist: [], email: 'a@x.com' })).toBe('a@x.com');
    expect(resolveRecipient({ mode: 'producao', allowlist: [], email: 'a@x.com' })).toBeNull();
  });
});

describe('o que o webhook faz com cada evento', () => {
  const ev = (type: string, productId: string, email = 'a@x.com') => ({ type, productId, email });

  it('ingresso aprovado registra o comprador', () => {
    expect(eventoAction(ev('order_approved', TICKET_PRODUCT_ID))).toEqual({ op: 'register', sandbox: false });
    expect(eventoAction(ev('order_approved', 'teste-1'), ['teste-1'])).toEqual({ op: 'register', sandbox: true });
  });

  it('reembolso e chargeback do ingresso cancelam', () => {
    expect(eventoAction(ev('order_refunded', TICKET_PRODUCT_ID))).toEqual({ op: 'cancel', status: 'refunded' });
    expect(eventoAction(ev('chargeback', TICKET_PRODUCT_ID))).toEqual({ op: 'cancel', status: 'chargeback' });
  });

  it('gravação, reserva e Protocol aprovados marcam o comprador', () => {
    expect(eventoAction(ev('order_approved', RECORDING_PRODUCT_ID))).toEqual({ op: 'mark', kind: 'recording' });
    expect(eventoAction(ev('order_approved', PROTOCOL_DEPOSIT_PRODUCT_ID))).toEqual({
      op: 'mark',
      kind: 'protocol_deposit',
    });
    expect(eventoAction(ev('order_approved', 'a0361350-b793-11f1-a02f-752fbbcb4576'))).toEqual({
      op: 'mark',
      kind: 'protocol',
    });
  });

  it('ignora o resto, dizendo por quê', () => {
    expect(eventoAction(ev('pix_created', TICKET_PRODUCT_ID))).toMatchObject({ op: 'ignore' });
    expect(eventoAction(ev('order_refunded', RECORDING_PRODUCT_ID))).toMatchObject({ op: 'ignore' });
    expect(eventoAction(ev('order_approved', 'circle-qualquer'))).toMatchObject({ op: 'ignore' });
    expect(eventoAction(ev('order_approved', TICKET_PRODUCT_ID, '  '))).toEqual({ op: 'ignore', reason: 'sem-email' });
  });
});
