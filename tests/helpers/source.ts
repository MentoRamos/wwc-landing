import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Marca cada caractere que está dentro de `//` ou de um comentário de bloco.
 *
 * Posicional, não por linha, e é de propósito: um comentário de bloco ocupa
 * várias linhas, e uma regra tipo `^\s*\*` deixaria passar código que dividisse
 * linha com o fim de um comentário. Vive aqui porque duas travas diferentes
 * dependem dela, e duas cópias de uma função sutil divergem.
 */
export function commentMask(source: string): boolean[] {
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

/** Todo arquivo com uma das extensões, abaixo de `dir`. */
export function walk(dir: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...walk(path, extensions));
    } else if (extensions.some((extension) => entry.endsWith(extension))) {
      found.push(path);
    }
  }
  return found;
}

/** Linha (1-indexada) em que está o índice. */
export function lineAt(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

export { readFileSync };
