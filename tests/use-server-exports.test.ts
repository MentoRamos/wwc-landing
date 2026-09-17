import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentMask, lineAt, walk } from './helpers/source';

/**
 * Um módulo `'use server'` só pode exportar função async.
 *
 * O Next valida isso ao CARREGAR o módulo e lança E352: "A 'use server' file
 * can only export async functions, found object". E foi assim que a
 * administração inteira ficou quebrada em produção sem ninguém ver: três
 * arquivos de action exportavam um `INITIAL_STATE`, que é objeto.
 *
 * O modo de falhar é o que custou caro. O erro é do carregamento, não da ação,
 * então a ação nunca chega a rodar: nenhum try/catch dentro dela pega, nada
 * aparece no log da aplicação, e a tela mostra só o error boundary com um
 * digest. Passei um bom tempo procurando dentro da minha ação, escrevi um
 * try/catch que não pegou nada, e cheguei a culpar `allowedOrigins`.
 *
 * `export type` fica: tipo não existe depois da compilação, e o que não pode
 * atravessar a fronteira é valor. Por isso a varredura ignora `export type`.
 */
const ROOTS = ['app', 'lib', 'components'];
const VALOR_EXPORTADO = /^export\s+(const|let|var|class|default|function\s+(?!\s*async))/gm;

function serverModules(): string[] {
  return ROOTS.flatMap((root) => walk(join(process.cwd(), root), ['.ts', '.tsx'])).filter((path) => {
    const source = readFileSync(path, 'utf8');
    const mask = commentMask(source);
    const at = source.search(/^['"]use server['"]/m);
    return at !== -1 && !mask[at];
  });
}

function offenders(): string[] {
  const hits: string[] = [];

  for (const path of serverModules()) {
    const source = readFileSync(path, 'utf8');
    const mask = commentMask(source);

    for (const match of source.matchAll(VALOR_EXPORTADO)) {
      if (mask[match.index]) continue;
      // `export function` sem async é tão inválido quanto objeto, e o regex já
      // o pega; `export async function` passa e é o único caso legítimo.
      const linha = source.slice(match.index, source.indexOf('\n', match.index)).trim();
      hits.push(`${path.replace(process.cwd(), '.')}:${lineAt(source, match.index)} ${linha.slice(0, 70)}`);
    }
  }

  return hits;
}

describe("os módulos 'use server'", () => {
  it('existem, senão este teste não protege nada', () => {
    expect(serverModules().length).toBeGreaterThan(0);
  });

  it('só exportam função async', () => {
    expect(offenders()).toEqual([]);
  });

  it('acham a exportação proibida quando ela existe', () => {
    const fonte = [
      "'use server';",
      'export type ActionState = { ok: boolean };',
      'export const INITIAL_STATE = { ok: false };',
      'export async function agir() {}',
      '// export const isso_e_comentario = 1;',
    ].join('\n');

    const mask = commentMask(fonte);
    const achados = [...fonte.matchAll(VALOR_EXPORTADO)].filter((m) => !mask[m.index]);

    expect(achados).toHaveLength(1);
    expect(achados[0][0]).toContain('const');
  });
});
