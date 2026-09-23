/**
 * O número da capa, em romano.
 *
 * As capas dos guias não existem como arquivo, e produzir onze imagens antes
 * de a biblioteca poder mudar de forma seria trocar uma dívida por outra
 * maior. O romano resolve o problema hoje: dá à capa uma marca que é
 * tipográfica, da família da marca, e que nunca fica desatualizada nem pesa
 * um byte de download.
 *
 * Fora do domínio devolve string vazia em vez de lançar. Uma capa sem número
 * é uma capa; uma exceção no meio de uma prateleira derruba a página inteira
 * por causa de um dado ruim numa linha.
 */

const TABLE: Array<[number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function roman(n: number): string {
  if (!Number.isInteger(n) || n <= 0) return '';

  let left = n;
  let out = '';

  for (const [value, numeral] of TABLE) {
    while (left >= value) {
      out += numeral;
      left -= value;
    }
  }

  return out;
}
