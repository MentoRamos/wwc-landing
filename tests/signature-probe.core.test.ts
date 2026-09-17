import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { matchOf, signatureGuesses } from '@/lib/core/signature-probe.core';

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
