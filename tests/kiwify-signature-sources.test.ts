import { describe, expect, it } from 'vitest';
import { signatureCandidates } from '@/lib/kiwify/config';

/**
 * De onde a assinatura vem também é chute: a Kiwify não diz se ela viaja na
 * query ou num header, nem com que nome. A versão anterior lia UM lugar,
 * escolhido por variável de ambiente — e ler o lugar errado é
 * indistinguível, na resposta, de uma assinatura falsa.
 *
 * Então recolhemos todos os lugares plausíveis e deixamos a verificação
 * decidir. Recolher não concede nada: cada candidato ainda precisa bater com
 * o segredo.
 */
const req = (url: string, headers: Record<string, string> = {}) =>
  new Request(url, { method: 'POST', headers });

describe('signatureCandidates', () => {
  it('recolhe a assinatura da query, com o nome de onde veio', () => {
    expect(signatureCandidates(req('https://x.test/w?signature=abc'))).toEqual([
      { source: 'query:signature', value: 'abc' },
    ]);
  });

  it('recolhe também o que vier como token, que é o que a doc menciona', () => {
    expect(signatureCandidates(req('https://x.test/w?token=abc'))).toEqual([
      { source: 'query:token', value: 'abc' },
    ]);
  });

  it('recolhe headers de assinatura, qualquer que seja o nome', () => {
    const got = signatureCandidates(
      req('https://x.test/w', {
        'x-kiwify-signature': 'aaa',
        'x-webhook-token': 'bbb',
      }),
    );
    expect(got).toContainEqual({ source: 'header:x-kiwify-signature', value: 'aaa' });
    expect(got).toContainEqual({ source: 'header:x-webhook-token', value: 'bbb' });
  });

  it('não confunde cabeçalho de autenticação nossa com assinatura deles', () => {
    const got = signatureCandidates(req('https://x.test/w', { authorization: 'Bearer segredo' }));
    expect(got).toEqual([]);
  });

  it('ignora o que veio vazio, para não testar a string vazia contra o segredo', () => {
    expect(signatureCandidates(req('https://x.test/w?signature=&token=  '))).toEqual([]);
  });

  it('devolve nada quando não veio nada, e nada é recusa', () => {
    expect(signatureCandidates(req('https://x.test/w'))).toEqual([]);
  });
});
