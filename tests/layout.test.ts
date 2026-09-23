import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentMask, lineAt, walk } from './helpers/source';

/**
 * A regra de enquadramento, escrita como teste.
 *
 * O `wwc-DESIGN.md` diz, com essas palavras, que metade da tela vazia é falha
 * de enquadramento. A área logada quebrava isso em toda página: cada bloco
 * saía com `max-w-2xl` dentro de um container de 1440px, então o cabeçalho ia
 * de ponta a ponta e o conteúdo parava em 672px. Num monitor, o lado direito
 * inteiro ficava preto.
 *
 * O detalhe que torna isso simplesmente errado, e não uma questão de gosto: a
 * medida de leitura JÁ está limitada no CSS. `.lede` corta em 58ch e
 * `.prose-body` em 66ch. Um `max-w-*` escrito à mão em volta da seção não
 * protege linha nenhuma, porque a linha já estava protegida — ele só encolhe o
 * layout. O que sobra é o defeito, sem o benefício.
 *
 * A varredura anda o diretório em vez de conferir uma lista escrita à mão.
 * Lista à mão passa verde com o defeito vivo: a página nova não está nela.
 *
 * Fora do alcance de propósito: `(site)` é a face de venda, e uma coluna de
 * leitura centralizada (`mx-auto max-w-2xl` dos termos e da privacidade) não
 * deixa metade vazia, deixa duas margens iguais. O `/circle` entra na lista
 * porque a metade logada dele mora nesse arquivo.
 */
const ROOTS = ['app/(app)', 'app/admin'];
const ALSO = ['app/(site)/circle/page.tsx'];
const CAP = /\bmax-w-(?:xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|prose|\[[^\]]+\])/g;

function files(): string[] {
  const found = ROOTS.flatMap((root) => walk(join(process.cwd(), root), ['.tsx']));
  return [...found, ...ALSO.map((path) => join(process.cwd(), path))];
}

function offenders(): string[] {
  const hits: string[] = [];

  for (const path of files()) {
    const source = readFileSync(path, 'utf8');
    const mask = commentMask(source);

    for (const match of source.matchAll(CAP)) {
      const at = match.index;
      if (mask[at]) continue;
      hits.push(`${path.replace(process.cwd(), '.')}:${lineAt(source, at)} ${match[0]}`);
    }
  }

  return hits;
}

describe('a regra de enquadramento', () => {
  it('não deixa a área logada travar a própria largura', () => {
    expect(offenders()).toEqual([]);
  });

  /**
   * Sem isto, o teste acima passa verde num mundo em que a varredura está
   * quebrada: um `walk` que não acha arquivo nenhum devolve lista vazia e
   * parece sucesso.
   */
  it('acha o arquivo e enxerga a trava quando ela existe', () => {
    expect(files().length).toBeGreaterThan(4);

    const source = '<section className="max-w-2xl">\n// max-w-3xl aqui é só conversa\n';
    const mask = commentMask(source);
    const visible = [...source.matchAll(CAP)].filter((match) => !mask[match.index]);

    expect(visible).toHaveLength(1);
    expect(visible[0][0]).toBe('max-w-2xl');
  });
});
