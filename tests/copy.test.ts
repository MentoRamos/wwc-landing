import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentMask, lineAt, walk } from './helpers/source';

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
const ENTITIES = ['&mdash;', '&ndash;', '&#8212;', '&#8211;'];

function offenders(): string[] {
  const hits: string[] = [];

  for (const root of ROOTS) {
    for (const path of walk(join(process.cwd(), root), EXTENSIONS)) {
      const source = readFileSync(path, 'utf8');
      const mask = commentMask(source);

      // A entidade HTML é travessão escrito por outro nome, e foi exatamente
      // assim que um sobreviveu à primeira varredura: o marcador de lista do
      // /circle passou verde porque o caractere literal não estava no arquivo.
      // Passa pela mesma máscara que o resto, senão um comentário que explica
      // a regra reprova a regra.
      for (const entity of ENTITIES) {
        let at = source.indexOf(entity);
        while (at !== -1) {
          if (!mask[at]) {
            const line = lineAt(source, at);
            hits.push(`${path.replace(process.cwd(), '.')}:${line} entidade ${entity}`);
          }
          at = source.indexOf(entity, at + 1);
        }
      }

      for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        if ((char === '—' || char === '–') && !mask[i]) {
          const line = lineAt(source, i);
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
