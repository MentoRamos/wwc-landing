/**
 * A linha do dado, como geometria pura.
 *
 * A página do Circle fala de dado desde o título e nunca mostrou um. O que
 * faltava não era gráfico de biblioteca: era o gesto mínimo que um relatório
 * de verdade usa para dizer "isto mudou ao longo das semanas" sem pedir
 * legenda, eixo nem tooltip.
 *
 * Mora aqui, fora do componente, porque é aritmética: dada uma série e uma
 * caixa, sai um caminho. Sem React, sem DOM, sem CSS — logo, testável por
 * igualdade em vez de por captura de tela.
 */

export type SparkBox = {
  width: number;
  height: number;
  /** Respiro vertical, para que o traço não encoste na borda da caixa. */
  pad?: number;
};

/**
 * Normaliza a série na altura da caixa.
 *
 * Duas decisões que não são óbvias e que o teste trava:
 *
 * 1. O eixo vertical é invertido. Em SVG o y cresce para baixo; num gráfico o
 *    valor cresce para cima. Sem a inversão, a linha desenha o espelho do que
 *    o dado diz, e o erro é invisível para quem não conhece a série.
 * 2. Série constante não divide por zero. Quando todos os valores são iguais a
 *    amplitude é 0; nesse caso a linha fica no meio da caixa, que é a leitura
 *    honesta de "não mudou".
 */
export function sparkPoints(values: number[], box: SparkBox): Array<[number, number]> {
  if (values.length === 0) return [];

  const pad = box.pad ?? 0;
  const usable = box.height - pad * 2;

  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low;

  // Um ponto sozinho não tem linha: fica no centro, e quem desenha decide se
  // vira bolinha ou nada.
  const step = values.length > 1 ? box.width / (values.length - 1) : 0;

  return values.map((value, index) => {
    const ratio = span === 0 ? 0.5 : (value - low) / span;
    const y = pad + usable * (1 - ratio);
    const x = values.length > 1 ? step * index : box.width / 2;

    return [round(x), round(y)];
  });
}

/** O `d` de um `<path>`: uma polilinha, sem curva e sem suavização. */
export function sparkPath(values: number[], box: SparkBox): string {
  const points = sparkPoints(values, box);
  if (points.length === 0) return '';

  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
}

/**
 * Duas casas bastam para um traço de 120px e evitam que o SVG carregue
 * dezessete dígitos de ruído de ponto flutuante em cada coordenada.
 */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
