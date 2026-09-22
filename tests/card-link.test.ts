import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isRouteLink } from '@/components/ui/Card';

/**
 * Nem todo destino é uma rota, e o Next trata todos como se fossem.
 *
 * `next/link` faz prefetch: assim que o cartão entra na viewport, o navegador
 * busca o destino sozinho, sem ninguém ter clicado. Para uma página isso é a
 * feature. Para `/api/aluno/[id]/download` é um defeito de auditoria, porque
 * aquele handler tem efeito: ele grava `document_access_log` e assina uma URL
 * do bucket antes de redirecionar.
 *
 * O estrago é nos dois sentidos. A trilha de acesso a dado de saúde passa a
 * registrar leituras que ninguém fez, o que é exatamente o contrário do que o
 * handler diz garantir, e o aluno que abrir a própria página de documentos
 * queima uma URL assinada por cartão visível.
 *
 * A decisão de quando o destino é uma rota fica aqui, numa função, em vez de
 * ficar na cabeça de quem escreve a próxima página.
 */
describe('isRouteLink', () => {
  it('trata um caminho interno como rota', () => {
    expect(isRouteLink('/biblioteca')).toBe(true);
    expect(isRouteLink('/biblioteca/encontro-01')).toBe(true);
  });

  it('nunca trata uma rota de API como rota de navegação', () => {
    expect(isRouteLink('/api/aluno/abc/download')).toBe(false);
    expect(isRouteLink('/api/biblioteca/guia/download')).toBe(false);
  });

  it('deixa passar por âncora o que sai do site', () => {
    expect(isRouteLink('https://meet.google.com/abc-defg-hij')).toBe(false);
    expect(isRouteLink('mailto:kaua@exemplo.com')).toBe(false);
    expect(isRouteLink('tel:+5562999999999')).toBe(false);
  });
});

/**
 * A guarda de verdade: nenhuma página pode voltar a apontar um cartão para um
 * endpoint com efeito e contar com o prefetch se comportar.
 */
describe('cartões que apontam para a API', () => {
  const pages = [
    'app/(app)/aluno/page.tsx',
    'app/(app)/biblioteca/[slug]/page.tsx',
    'app/(app)/inicio/page.tsx',
    'app/(app)/conta/page.tsx',
  ];

  it('o Card decide pela função, e não por um prefetch escrito à mão', () => {
    const card = readFileSync(join(process.cwd(), 'components/ui/Card.tsx'), 'utf8');
    expect(card).toContain('isRouteLink');
  });

  for (const page of pages) {
    it(`${page} não confia no Link para um destino de API`, () => {
      let source: string;
      try {
        source = readFileSync(join(process.cwd(), page), 'utf8');
      } catch {
        // Uma página que deixou de existir não é uma falha desta guarda.
        return;
      }

      // O Card resolve sozinho desde que a decisão passe por `isRouteLink`;
      // o que esta guarda proíbe é a página montar o seu próprio `<Link>`
      // para a API, que é o caminho que existia antes.
      const linkToApi = /<Link[^>]*href=\{?[`'"]\/api\//;
      expect(linkToApi.test(source)).toBe(false);
    });
  }
});
