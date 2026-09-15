import { describe, expect, it } from 'vitest';
import { STEPS, dueFor, meetingKey, renderStep, type Member } from '@/lib/core/regua.core';
import { cronAuthorized } from '@/lib/cron-auth';

const member = (over: Partial<Member> = {}): Member => ({
  email_norm: 'aluno@exemplo.com',
  email_raw: 'Aluno@Exemplo.com',
  first_name: 'Mônica',
  started_at: '2026-09-01T12:00:00Z',
  expires_at: null,
  status: 'active',
  ...over,
});

const meeting = new Date('2026-09-17T23:00:00Z'); // quinta 20:00 em São Paulo
const none = new Set<string>();

describe('quem recebe o quê, e quando', () => {
  it('manda boas-vindas no primeiro tick depois da assinatura', () => {
    const due = dueFor(member(), none, new Date('2026-09-01T18:00:00Z'), meeting);
    expect(due?.key).toBe('welcome');
  });

  it('não repete um passo que já saiu', () => {
    const sent = new Set(['welcome']);
    const due = dueFor(member(), sent, new Date('2026-09-02T18:00:00Z'), meeting);
    expect(due).toBeNull();
  });

  it('manda um passo por tick, não o atraso inteiro de uma vez', () => {
    // Alguém que assinou há 100 dias deve zero e-mails acumulados: recebe o
    // primeiro que falta e só ele.
    const due = dueFor(member(), none, new Date('2026-12-10T12:00:00Z'), meeting);
    expect(due?.key).toBe('welcome');
  });

  it('chega no mês 1 só depois de 30 dias', () => {
    const sent = new Set(['welcome']);
    expect(dueFor(member(), sent, new Date('2026-09-29T12:00:00Z'), meeting)).toBeNull();
    expect(dueFor(member(), sent, new Date('2026-10-01T12:00:00Z'), meeting)?.key).toBe('month_1');
  });

  it('chega no mês 3 só depois de 90 dias', () => {
    const sent = new Set(['welcome', 'month_1']);
    expect(dueFor(member(), sent, new Date('2026-11-29T12:00:00Z'), meeting)).toBeNull();
    expect(dueFor(member(), sent, new Date('2026-12-01T12:00:00Z'), meeting)?.key).toBe('month_3');
  });
});

describe('a véspera do encontro', () => {
  it('sai na véspera, pelo calendário de São Paulo', () => {
    const sent = new Set(['welcome']);
    const eve = new Date('2026-09-16T15:00:00Z'); // quarta, em São Paulo
    expect(dueFor(member(), sent, eve, meeting)?.key).toBe(meetingKey(meeting));
  });

  it('não sai dois dias antes nem no próprio dia', () => {
    const sent = new Set(['welcome']);
    expect(dueFor(member(), sent, new Date('2026-09-15T15:00:00Z'), meeting)?.key).not.toBe(
      meetingKey(meeting),
    );
    expect(dueFor(member(), sent, new Date('2026-09-17T15:00:00Z'), meeting)?.key).not.toBe(
      meetingKey(meeting),
    );
  });

  /**
   * A véspera só serve na véspera: perdida, não adianta mandar depois. Já o
   * e-mail de mês 1 serve em qualquer dia. Por isso o sensível ao tempo ganha
   * do perene quando os dois caem no mesmo tick.
   */
  it('ganha do e-mail perene quando os dois caem no mesmo dia', () => {
    const sent = new Set(['welcome']);
    const eve = new Date('2026-10-14T15:00:00Z');
    const nextMeeting = new Date('2026-10-15T23:00:00Z');
    const due = dueFor(member(), sent, eve, nextMeeting);
    expect(due?.key).toBe(meetingKey(nextMeeting));
  });

  it('a chave carrega a data, então cada quinta é um envio novo', () => {
    expect(meetingKey(new Date('2026-09-17T23:00:00Z'))).toBe('meeting_2026-09-17');
    expect(meetingKey(new Date('2026-09-24T23:00:00Z'))).toBe('meeting_2026-09-24');
  });

  it('não manda véspera duas vezes para a mesma quinta', () => {
    const sent = new Set(['welcome', meetingKey(meeting)]);
    const due = dueFor(member(), sent, new Date('2026-09-16T15:00:00Z'), meeting);
    expect(due?.key).not.toBe(meetingKey(meeting));
  });
});

describe('quem não recebe nada', () => {
  it('não escreve para quem cancelou', () => {
    const due = dueFor(member({ status: 'canceled' }), none, new Date('2026-09-02T12:00:00Z'), meeting);
    expect(due).toBeNull();
  });

  /**
   * Cancelar vale até o fim do período já pago. Enquanto a data não chegou a
   * pessoa continua membro e continua recebendo — é o que ela pagou.
   */
  it('escreve para quem cancelou mas ainda tem prazo', () => {
    const due = dueFor(
      member({ status: 'active', expires_at: '2026-10-01T00:00:00Z' }),
      none,
      new Date('2026-09-02T12:00:00Z'),
      meeting,
    );
    expect(due?.key).toBe('welcome');
  });

  it('não escreve para quem já expirou', () => {
    const due = dueFor(
      member({ expires_at: '2026-09-01T00:00:00Z' }),
      none,
      new Date('2026-09-02T12:00:00Z'),
      meeting,
    );
    expect(due).toBeNull();
  });
});

describe('o que chega na caixa de entrada', () => {
  it('trata o primeiro nome como texto, não como HTML', () => {
    const rendered = renderStep(STEPS[0], member({ first_name: '<script>alert(1)</script>' }), meeting);
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
  });

  it('se vira sem nome nenhum', () => {
    const rendered = renderStep(STEPS[0], member({ first_name: null }), meeting);
    expect(rendered.subject).toBeTruthy();
    expect(rendered.html).not.toContain('null');
    expect(rendered.html).not.toContain('{{');
  });

  it('não deixa travessão no assunto nem no corpo', () => {
    for (const step of STEPS) {
      const rendered = renderStep(step, member(), meeting);
      expect(rendered.subject).not.toMatch(/[—–]/);
      // O corpo é HTML: o travessão proibido é o do texto, e o layout não usa
      // nenhum caractere desses nas tags.
      expect(rendered.html).not.toMatch(/[—–]/);
    }
  });

  it('todo passo tem assunto e corpo', () => {
    for (const step of STEPS) {
      const rendered = renderStep(step, member(), meeting);
      expect(rendered.subject.length).toBeGreaterThan(5);
      expect(rendered.html.length).toBeGreaterThan(200);
    }
  });
});

describe('a porta do cron', () => {
  it('recusa quando não há segredo configurado', () => {
    expect(cronAuthorized('Bearer qualquer', undefined)).toBe(false);
    expect(cronAuthorized('Bearer qualquer', '   ')).toBe(false);
  });

  it('recusa sem cabeçalho', () => {
    expect(cronAuthorized(null, 'segredo')).toBe(false);
  });

  it('recusa segredo errado, inclusive um que só acerta o começo', () => {
    expect(cronAuthorized('Bearer segred', 'segredo')).toBe(false);
    expect(cronAuthorized('Bearer segredoo', 'segredo')).toBe(false);
    expect(cronAuthorized('Bearer outro12', 'segredo')).toBe(false);
  });

  it('aceita o que a Vercel manda', () => {
    expect(cronAuthorized('Bearer segredo', 'segredo')).toBe(true);
    expect(cronAuthorized('Bearer segredo', ' segredo ')).toBe(true);
  });
});
