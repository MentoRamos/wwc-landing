import { describe, expect, it } from 'vitest';
import { sparkPath, sparkPoints } from '@/lib/core/sparkline.core';

const BOX = { width: 100, height: 40 };

describe('sparkPoints', () => {
  it('não desenha nada para série vazia', () => {
    expect(sparkPoints([], BOX)).toEqual([]);
  });

  it('põe o maior valor no topo e o menor embaixo', () => {
    const [first, last] = sparkPoints([1, 5], BOX);

    // O eixo do SVG cresce para baixo; o do gráfico, para cima. Se alguém
    // tirar a inversão, o maior valor vai para y=40 e este teste cai.
    expect(first[1]).toBe(40);
    expect(last[1]).toBe(0);
  });

  it('distribui os pontos na largura da caixa', () => {
    const points = sparkPoints([3, 1, 2], BOX);

    expect(points.map(([x]) => x)).toEqual([0, 50, 100]);
  });

  it('põe série constante no meio, sem dividir por zero', () => {
    const points = sparkPoints([7, 7, 7], BOX);

    expect(points.map(([, y]) => y)).toEqual([20, 20, 20]);
    expect(points.every(([, y]) => Number.isFinite(y))).toBe(true);
  });

  it('respeita o respiro e nunca encosta na borda', () => {
    const points = sparkPoints([0, 10], { ...BOX, pad: 4 });
    const ys = points.map(([, y]) => y);

    expect(Math.min(...ys)).toBe(4);
    expect(Math.max(...ys)).toBe(36);
  });

  it('centra o ponto único em vez de encostá-lo à esquerda', () => {
    expect(sparkPoints([9], BOX)).toEqual([[50, 20]]);
  });

  it('arredonda para duas casas', () => {
    const points = sparkPoints([0, 1, 2], { width: 10, height: 3 });

    for (const [x, y] of points) {
      expect(x).toBe(Math.round(x * 100) / 100);
      expect(y).toBe(Math.round(y * 100) / 100);
    }
  });
});

describe('sparkPath', () => {
  it('devolve string vazia para série vazia', () => {
    expect(sparkPath([], BOX)).toBe('');
  });

  it('abre com M e segue em L, sem curva', () => {
    expect(sparkPath([1, 5, 3], BOX)).toBe('M0 40 L50 0 L100 20');
  });
});
