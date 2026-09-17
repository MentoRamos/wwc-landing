import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FUNNEL_ROUTES } from '@/lib/core/site-links.core';

/**
 * Todo link da navegação pública leva a algum lugar.
 *
 * Um href errado não quebra build, não quebra tipo e não aparece em teste de
 * unidade: ele vira 404 para quem clicou, e quem escreveu o link é justamente
 * quem nunca clica nele. Depois que a navegação passou a apontar para dois
 * projetos ao mesmo tempo, o erro ficou mais fácil ainda — metade dos destinos
 * não está neste repositório.
 *
 * A lista de rotas válidas é DERIVADA: as daqui saem andando `app/`, as de lá
 * saem de `FUNNEL_ROUTES`. Uma lista escrita à mão passaria verde com o link
 * quebrado vivo, que é o defeito que esta guarda existe para pegar.
 */
function routesFromApp(dir = 'app', prefix = ''): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) {
      if (entry === 'page.tsx') found.push(prefix === '' ? '/' : prefix);
      continue;
    }
    // `(site)` e `(app)` são grupos: organizam o código e não aparecem na URL.
    const segment = entry.startsWith('(') && entry.endsWith(')') ? '' : `/${entry}`;
    found.push(...routesFromApp(full, `${prefix}${segment}`));
  }

  return found;
}

function hrefsIn(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/href[:=]\s*['"`](\/[^'"`\s]*)['"`]/g)].map((m) => m[1]);
}

const ROUTES = new Set<string>([...routesFromApp(), ...FUNNEL_ROUTES]);

/** `/circle/artigos/[slug]` casa com qualquer slug; o resto é literal. */
function exists(href: string): boolean {
  const path = href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
  if (ROUTES.has(path)) return true;

  return [...ROUTES].some((route) => {
    if (!route.includes('[')) return false;
    const pattern = new RegExp(`^${route.replace(/\[[^\]]+\]/g, '[^/]+')}$`);
    return pattern.test(path);
  });
}

describe('navegação pública', () => {
  it('derivou as rotas do diretório, e não de uma lista escrita à mão', () => {
    expect(ROUTES.has('/circle')).toBe(true);
    expect(ROUTES.has('/entrar')).toBe(true);
    expect(ROUTES.has('/circle/artigos')).toBe(true);
  });

  for (const file of [
    'components/layout/SiteNav.tsx',
    'components/layout/SiteFooter.tsx',
    'components/layout/SiteHeader.tsx',
    'components/layout/AppNav.tsx',
    'components/layout/AppTabBar.tsx',
    // O admin também: o link novo daqui é justamente o tipo que apodrece sem
    // ninguém ver, porque quem escreve a navegação do admin é quem menos clica
    // nela.
    'app/admin/layout.tsx',
  ]) {
    it(`não deixa link morto em ${file}`, () => {
      const quebrados = hrefsIn(file).filter((href) => !exists(href));
      expect(quebrados).toEqual([]);
    });
  }

  it('reprova um destino que não existe em nenhum dos dois projetos', () => {
    expect(exists('/mentorias')).toBe(false);
    expect(exists('/circle')).toBe(true);
    expect(exists('/mentoria')).toBe(true);
  });
});
