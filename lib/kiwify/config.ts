import type { Product } from '@/lib/core/admin.core';

/**
 * Everything about Kiwify that we had to guess, kept in the environment so
 * that pinning it down later is a deploy and not a release.
 *
 * Kiwify documents the event names and a `token`, but not which algorithm
 * signs the body nor where the signature travels. The moment a real test event
 * is captured, these three variables record the answer.
 */
export function webhookSecret(): string {
  return process.env.KIWIFY_WEBHOOK_TOKEN?.trim() ?? '';
}

/**
 * De onde a assinatura pode ter vindo, com o nome do lugar.
 *
 * A Kiwify não diz se ela viaja na query ou num header, nem com que nome. Ler
 * um único lugar escolhido por variável de ambiente tinha um defeito calado:
 * ler o lugar errado é indistinguível, na resposta, de uma assinatura falsa —
 * os dois dão 400, e o primeiro dá 400 numa venda legítima.
 *
 * Então recolhemos todos os lugares plausíveis e deixamos `detectSignature`
 * decidir. Recolher não concede: cada candidato ainda tem que bater com o
 * segredo. O que fica de fora é `authorization`, que é autenticação nossa e
 * não prova de origem deles.
 */
const NOME_DE_ASSINATURA = /(signature|hmac|hash|(^|[-_])token)/i;

/**
 * A plataforma assina as próprias requisições, e isso não é prova de origem.
 *
 * Toda requisição que passa pelo rewrite do funil chega com
 * `x-vercel-proxy-signature`, `x-vercel-oidc-token` e companhia — quatro
 * nomes que casam com o padrão acima. Não é buraco: nenhum deles bate com o
 * nosso segredo, e só quem bate é aceito. O estrago é no diagnóstico, que é
 * a razão de a sonda existir: a assinatura da Kiwify chegaria enterrada em
 * quatro assinaturas da Vercel, e quem abrisse o alerta para descobrir como
 * a Kiwify assina leria a infraestrutura.
 */
const DA_INFRAESTRUTURA = /^x-vercel-/i;

export function signatureCandidates(request: Request): { source: string; value: string }[] {
  const out: { source: string; value: string }[] = [];

  const add = (source: string, raw: string | null) => {
    const value = raw?.trim();
    if (value) out.push({ source, value });
  };

  for (const [name, value] of new URL(request.url).searchParams) {
    if (NOME_DE_ASSINATURA.test(name)) add(`query:${name}`, value);
  }

  for (const [name, value] of request.headers) {
    if (name.toLowerCase() === 'authorization') continue;
    if (DA_INFRAESTRUTURA.test(name)) continue;
    if (NOME_DE_ASSINATURA.test(name)) add(`header:${name.toLowerCase()}`, value);
  }

  return out;
}

/**
 * Which Kiwify product is which of ours, as JSON:
 *
 *   KIWIFY_PRODUCTS='{"abc123":"circle","def456":"circle"}'
 *
 * An id that is not listed is not ours — Kauã may sell something else on the
 * same account one day, and an unmapped product must be ignored rather than
 * quietly granted the Library.
 */
export function productFor(externalId: string): Product | undefined {
  const raw = process.env.KIWIFY_PRODUCTS?.trim();
  if (!raw) return undefined;

  try {
    const map = JSON.parse(raw) as Record<string, Product>;
    return map[externalId];
  } catch {
    // A malformed map must not become "everything matches".
    console.error('[kiwify] KIWIFY_PRODUCTS não é um JSON válido');
    return undefined;
  }
}
