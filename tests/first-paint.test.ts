import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentMask } from './helpers/source';

/**
 * A página do evento tem que existir antes do JavaScript.
 *
 * O /connect entregava 236 elementos com `opacity:0` e o próprio H1 com
 * `clip-path: inset(100% 0 0 0)`, porque o Framer Motion serializa o `initial`
 * no HTML do servidor. Em 4G ruim a página ficava branca até hidratar; com
 * JavaScript desligado, branca para sempre. O texto estava lá para o Google e
 * não estava para gente — o pior dos dois mundos numa página que vende.
 *
 * Honestidade sobre o alcance destas travas: elas leem código, não HTML
 * renderizado. Provam que as três decisões que consertaram o defeito seguem
 * de pé, e não que nenhum componente novo vá reintroduzi-lo por outro caminho.
 * A medição de verdade é contar no HTML servido, e está no corpo do commit.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/**
 * Só o código, sem os comentários.
 *
 * A primeira versão desta trava reprovou pelo próprio texto que a explica: o
 * docstring do ScrollReveal cita `initial={{ opacity: 0 }}` para dizer por que
 * aquilo saiu. Um teste que não sabe distinguir a regra da menção à regra
 * obriga quem escreve a apagar a explicação, e a explicação é metade do valor.
 */
function code(path: string): string {
  const source = read(path);
  const mask = commentMask(source);
  return [...source].filter((_, i) => !mask[i]).join('');
}

describe('o primeiro paint do /connect', () => {
  it('não devolve o reveal de conteúdo para o Framer', () => {
    const source = code('components/animations/ScrollReveal.tsx');

    // O estado de repouso do ScrollReveal é visível, e quem esconde é o
    // próprio componente depois de decidir que o elemento está abaixo da
    // dobra. Uma linha de `initial` aqui volta a esconder no servidor.
    expect(source).not.toContain('framer-motion');
    expect(source).not.toContain('initial=');
    expect(source).toContain('getBoundingClientRect');
  });

  it('mantém a rede para quem navega sem JavaScript', () => {
    const source = code('app/layout.tsx');

    expect(source).toContain('<noscript>');
    // As duas assinaturas que o Framer deixa no HTML: opacidade com transform
    // (reveal de conteúdo) e clip-path fechado (título mascarado).
    expect(source).toContain('[style*="opacity:0"][style*="transform:"]');
    expect(source).toContain('[style*="clip-path:inset(100%"]');
    expect(source).toContain('!important');
  });

  it('não deixa o maior texto da página depender de hidratação', () => {
    const source = code('components/home/HeroSection.tsx');

    // `clip-path: inset(100% ...)` dá altura zero ao H1. Em CSS a entrada
    // anima sem JS nenhum, então não há motivo para voltar a isto.
    expect(source).not.toContain("inset(100% 0% 0% 0%)");
    expect(source).toContain('hero-mask-up');
  });
});
