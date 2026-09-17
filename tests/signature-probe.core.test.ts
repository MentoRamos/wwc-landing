import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  matchOf,
  shownGuesses,
  signatureGuesses,
  summarizeProbe,
} from '@/lib/core/signature-probe.core';

/**
 * A sonda guarda o corpo e a assinatura que veio. Descobrir qual algoritmo os
 * liga é uma conta — e uma conta feita à mão, na pressa de uma venda que não
 * entrou, é onde se erra.
 *
 * Então a tela faz a conta: calcula o que a assinatura SERIA sob cada forma
 * plausível e marca a que bate. O segredo nunca aparece na resposta, só os
 * digests, que é o que a Kiwify já mandou de qualquer jeito.
 */
const SECRET = 'segredo-do-webhook';
const BODY = '{"order_id":"abc","webhook_event_type":"order_approved"}';

describe('signatureGuesses', () => {
  it('calcula cada forma plausível sobre o corpo cru', () => {
    const rotulos = signatureGuesses(BODY, SECRET).map((g) => g.label);
    expect(rotulos).toContain('hmac-sha1 · hex');
    expect(rotulos).toContain('hmac-sha256 · hex');
    expect(rotulos).toContain('hmac-sha256 · base64');
    expect(rotulos).toContain('o token, repetido');
  });

  it('o digest que calcula é o digest de verdade', () => {
    const esperado = createHmac('sha256', SECRET).update(BODY).digest('hex');
    const achado = signatureGuesses(BODY, SECRET).find((g) => g.label === 'hmac-sha256 · hex');
    expect(achado?.digest).toBe(esperado);
  });

  it('nunca devolve o segredo como se fosse um digest calculado', () => {
    const digests = signatureGuesses(BODY, SECRET)
      .filter((g) => g.label !== 'o token, repetido')
      .map((g) => g.digest);
    expect(digests).not.toContain(SECRET);
  });
});

describe('matchOf', () => {
  it('nomeia a forma que bate com o que chegou', () => {
    const seen = createHmac('sha1', SECRET).update(BODY).digest('hex');
    expect(matchOf(signatureGuesses(BODY, SECRET), seen)).toBe('hmac-sha1 · hex');
  });

  it('reconhece o mesmo digest em maiúsculas', () => {
    const seen = createHmac('sha256', SECRET).update(BODY).digest('hex').toUpperCase();
    expect(matchOf(signatureGuesses(BODY, SECRET), seen)).toBe('hmac-sha256 · hex');
  });

  it('devolve nulo quando nenhuma bate — que é o caso que importa consertar', () => {
    expect(matchOf(signatureGuesses(BODY, SECRET), 'nada-a-ver')).toBeNull();
    expect(matchOf(signatureGuesses(BODY, SECRET), null)).toBeNull();
  });
});

/**
 * A tela existia para responder a pergunta de quem escreve o código ("qual
 * algoritmo?"). A pergunta de quem recebe o dinheiro é outra, e vem antes:
 * alguém pagou e não recebeu?
 *
 * `summarizeProbe` tira do corpo cru o que responde a essa: quem comprou, o
 * que aconteceu, e por qual produto. Um corpo que não é JSON, ou que é de um
 * teste bobo, não pode derrubar a tela inteira.
 */
describe('summarizeProbe', () => {
  it('tira do corpo quem comprou e o que aconteceu', () => {
    const body = JSON.stringify({
      order_id: 'o1',
      webhook_event_type: 'order_approved',
      Customer: { email: 'quem@pagou.test' },
      Product: { product_id: 'p1' },
    });

    expect(summarizeProbe(body)).toEqual({
      email: 'quem@pagou.test',
      event: 'compra aprovada',
      productId: 'p1',
    });
  });

  it('traduz o nome do evento em vez de despejar o nome técnico', () => {
    const body = JSON.stringify({
      order_id: 'o2',
      webhook_event_type: 'subscription_canceled',
      Customer: { email: 'a@b.test' },
    });
    expect(summarizeProbe(body)?.event).toBe('assinatura cancelada');
  });

  it('mantém o nome técnico quando o evento é desconhecido, em vez de mentir', () => {
    const body = JSON.stringify({ order_id: 'o3', webhook_event_type: 'coisa_nova' });
    expect(summarizeProbe(body)?.event).toBe('coisa_nova');
  });

  it('devolve nulo para corpo que não é evento, sem derrubar a tela', () => {
    expect(summarizeProbe('isto não é json')).toBeNull();
    expect(summarizeProbe('{"teste":"sonda de verificacao"}')).toBeNull();
    expect(summarizeProbe('')).toBeNull();
    expect(summarizeProbe(null)).toBeNull();
  });
});

/**
 * Nada que a tela mostra pode ser o segredo.
 *
 * "o token, repetido" é uma hipótese legítima de como a Kiwify assina, mas
 * imprimir o token para conferir é trocar um problema por outro: segredo em
 * tela vaza por screenshot. O veredito diz se bateu; o valor fica escondido.
 */
describe('o segredo não vai para a tela', () => {
  it('esconde o valor do token na lista mostrada', () => {
    const shown = shownGuesses(BODY, SECRET);
    expect(shown.map((g) => g.digest)).not.toContain(SECRET);
    expect(shown.find((g) => g.label === 'o token, repetido')?.digest).toBe('(escondido)');
  });

  it('mas o veredito continua reconhecendo o token repetido', () => {
    expect(matchOf(signatureGuesses(BODY, SECRET), SECRET)).toBe('o token, repetido');
  });
});
