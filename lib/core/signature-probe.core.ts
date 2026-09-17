import { createHmac } from 'node:crypto';

/**
 * O que a assinatura SERIA, sob cada forma que a Kiwify poderia ter usado.
 *
 * A sonda guarda duas coisas: o corpo cru e a assinatura que chegou. O que
 * falta entre elas é uma conta — e uma conta feita à mão, na pressa de uma
 * venda que não entrou, é exatamente onde se erra.
 *
 * Então a tela faz a conta. Calcula o digest do corpo sob cada algoritmo e
 * cada codificação plausíveis e marca o que bate com o que veio. Se nenhum
 * bater, isso também é resposta: a Kiwify assina algo que não é o corpo cru,
 * e o próximo passo é outro.
 *
 * O segredo entra aqui e não sai: o que a função devolve são digests, que é
 * o que a Kiwify já mandou pela rede de qualquer forma.
 */
export type Guess = { label: string; digest: string };

const ALGORITMOS = ['md5', 'sha1', 'sha256', 'sha512'] as const;
const CODIFICACOES = ['hex', 'base64'] as const;

export function signatureGuesses(body: string, secret: string): Guess[] {
  const out: Guess[] = [];

  for (const algorithm of ALGORITMOS) {
    for (const encoding of CODIFICACOES) {
      out.push({
        label: `hmac-${algorithm} · ${encoding}`,
        digest: createHmac(algorithm, secret).update(body).digest(encoding),
      });
    }
  }

  // Não é digest de nada: é a hipótese de que a Kiwify só devolve o mesmo
  // token que ela mostra no painel. Fica por último porque é a mais simples e
  // a menos informativa — se for essa, a assinatura não prova que o corpo
  // chegou inteiro, só que quem postou conhece o token.
  out.push({ label: 'o token, repetido', digest: secret });

  return out;
}

/**
 * Qual das formas bate com o que chegou, ou nenhuma.
 *
 * A comparação ignora maiúsculas porque hex é a mesma coisa nas duas caixas e
 * provedores discordam sobre qual usar. Isto é diagnóstico, não a porta: quem
 * decide entrar é `detectSignature`, em tempo constante. Aqui já se está
 * olhando para um evento que foi RECUSADO.
 */
export function matchOf(guesses: Guess[], seen: string | null | undefined): string | null {
  const alvo = seen?.trim();
  if (!alvo) return null;

  const found = guesses.find((guess) => guess.digest.toLowerCase() === alvo.toLowerCase());
  return found?.label ?? null;
}
