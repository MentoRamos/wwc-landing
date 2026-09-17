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

/**
 * Os quatro headers abaixo não são hipótese: foram os quatro que a sonda
 * relatou no primeiro POST sem assinatura contra a produção, em 17/09/2026.
 * A Vercel os acrescenta a TODA requisição que passa pelo rewrite do funil —
 * ou seja, a toda requisição real da Kiwify.
 *
 * Não é buraco de segurança: nenhum deles é igual ao nosso segredo, e o
 * `find` só aceita quem bate. O estrago é no diagnóstico, que é justamente
 * a razão de a sonda existir: a assinatura de verdade chega enterrada em
 * quatro assinaturas da infraestrutura, e quem for ler o alerta para
 * descobrir como a Kiwify assina vai ler a Vercel.
 */
describe('signatureCandidates ignora a infraestrutura', () => {
  const DA_VERCEL = {
    'x-vercel-proxy-signature': 'Bearer qualquer.coisa',
    'x-vercel-proxy-signature-ts': '1789658987',
    'x-vercel-oidc-token': 'eyJhbGciOi.qualquer.coisa',
    'x-vercel-is-internal-rewrite-signature': 'abc123',
  };

  it('não trata header da Vercel como candidato a assinatura', () => {
    expect(signatureCandidates(req('https://x.test/w', DA_VERCEL))).toEqual([]);
  });

  it('acha a assinatura da Kiwify no meio dos headers da Vercel', () => {
    const got = signatureCandidates(
      req('https://x.test/w', { ...DA_VERCEL, 'x-kiwify-signature': 'abc' }),
    );
    expect(got).toEqual([{ source: 'header:x-kiwify-signature', value: 'abc' }]);
  });
});
