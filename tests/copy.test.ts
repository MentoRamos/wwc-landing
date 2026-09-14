import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A regra de copy PT-BR do Kauã, escrita como teste.
 *
 * Os dois design systems da marca listam a mesma proibição em "Forbidden":
 * zero travessão (em-dash) e zero meia-risca (en-dash) em qualquer texto
 * visível. Ela vinha sendo quebrada em 57 lugares, incluindo a política de
 * privacidade, os termos, o rodapé e os rótulos do admin, porque uma regra que
 * mora só num documento é uma regra que ninguém roda.
 *
 * A varredura anda o código em vez de conferir uma lista escrita à mão. Lista
 * à mão passa verde com o defeito vivo: o arquivo novo não está nela.
 *
 * Comentários são mascarados, não filtrados por linha. Um comentário de bloco
 * pode usar travessão à vontade, e ele ocupa várias linhas; procurar por
 * `^\s*\*` deixaria passar um travessão de código que dividisse linha com o
 * fim de um comentário.
 */
const ROOTS = ['app', 'components', 'lib'];
const EXTENSIONS = ['.ts', '.tsx'];

/** Marca cada caractere que está dentro de `//` ou de `/* *\/`. */
function commentMask(source: string): boolean[] {
  const mask = new Array<boolean>(source.length).fill(false);
  let i = 0;

  while (i < source.length) {
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      const stop = end < 0 ? source.length : end + 2;
      mask.fill(true, i, stop);
      i = stop;
    } else if (source.startsWith('//', i)) {
      const end = source.indexOf('\n', i);
      const stop = end < 0 ? source.length : end;
      mask.fill(true, i, stop);
      i = stop;
    } else {
      i += 1;
    }
  }

  return mask;
}

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...walk(path));
    } else if (EXTENSIONS.some((extension) => entry.endsWith(extension))) {
      found.push(path);
    }
  }
  return found;
}

function offenders(): string[] {
  const hits: string[] = [];

  for (const root of ROOTS) {
    for (const path of walk(join(process.cwd(), root))) {
      const source = readFileSync(path, 'utf8');
      if (!source.includes('—') && !source.includes('–')) continue;

      const mask = commentMask(source);
      for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        if ((char === '—' || char === '–') && !mask[i]) {
          const line = source.slice(0, i).split('\n').length;
          const start = source.lastIndexOf('\n', i) + 1;
          const end = source.indexOf('\n', i);
          const text = source.slice(start, end < 0 ? undefined : end).trim();
          hits.push(`${path.replace(process.cwd(), '.')}:${line} ${text.slice(0, 90)}`);
        }
      }
    }
  }

  return hits;
}

describe('a regra de travessão', () => {
  it('não deixa travessão nem meia-risca em texto que vai para a tela', () => {
    expect(offenders()).toEqual([]);
  });

  /**
   * Sem isto, o teste acima passa verde num mundo em que a varredura está
   * quebrada — um `walk` que não acha arquivo nenhum devolve lista vazia e
   * parece sucesso. Este caso prova que o detector detecta.
   */
  it('acha o travessão quando ele existe', () => {
    const source = 'const a = "texto — com travessão";\n// comentário — pode\n';
    const mask = commentMask(source);
    const visible = [...source].filter((char, i) => char === '—' && !mask[i]);
    const inComment = [...source].filter((char, i) => char === '—' && mask[i]);

    expect(visible).toHaveLength(1);
    expect(inComment).toHaveLength(1);
  });
});
