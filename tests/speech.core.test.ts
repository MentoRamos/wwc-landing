import { describe, expect, it } from 'vitest';
import { speechChunks } from '@/lib/core/speech.core';
import { TOPICS, topicLabel } from '@/lib/core/covers.core';

describe('speechChunks', () => {
  const md = [
    'Você já ouviu que **uma taça** faz bem.',
    '',
    '## O erro na conta',
    '',
    '- Até 24 gramas: *nenhuma* redução.',
    '- Veja [o estudo](https://doi.org/10.1/x).',
    '',
    '> Uma citação.',
  ].join('\n');

  it('começa pelo título e pela linha fina', () => {
    const chunks = speechChunks('A taça', 'A linha fina.', md);
    expect(chunks[0]).toBe('A taça.');
    expect(chunks[1]).toBe('A linha fina.');
  });

  it('tira a sintaxe do markdown e mantém o texto do link, não a URL', () => {
    const all = speechChunks('T', 'D.', md).join(' ');
    expect(all).not.toMatch(/[*#>[\]]|https?:/);
    expect(all).toContain('uma taça faz bem');
    expect(all).toContain('Veja o estudo.');
    expect(all).toContain('O erro na conta.');
  });

  it('corta parágrafo longo em frases, para o Chrome não interromper a fala no meio', () => {
    const long = Array(12).fill('Esta é uma frase de tamanho comum no artigo.').join(' ');
    const chunks = speechChunks('T', 'D.', long);
    expect(chunks.length).toBeGreaterThan(3);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(260);
  });

  it('não devolve pedaço vazio', () => {
    expect(speechChunks('T', 'D.', '\n\n---\n\n').every((chunk) => chunk.trim().length > 0)).toBe(true);
  });
});

describe('topicLabel', () => {
  it('todo tema tem um nome para mostrar', () => {
    for (const topic of TOPICS) expect(topicLabel(topic).length).toBeGreaterThan(2);
  });

  it('nomeia com acento, como o leitor lê', () => {
    expect(topicLabel('alcool')).toBe('Álcool');
    expect(topicLabel('VO2')).toBe('Condicionamento');
  });
});

describe('articleHeadings', () => {
  it('lista as seções ## com âncora estável e sem acento', async () => {
    const { articleHeadings, headingId } = await import('@/lib/core/speech.core');
    const md = 'Abertura.\n\n## O erro na conta\n\nTexto.\n\n### Detalhe\n\n## Na prática\n\n- item';
    expect(articleHeadings(md)).toEqual([
      { id: 'o-erro-na-conta', text: 'O erro na conta' },
      { id: 'na-pratica', text: 'Na prática' },
    ]);
    expect(headingId('Na **prática**')).toBe('na-pratica');
  });

  it('duas seções com o mesmo nome ganham âncoras diferentes', async () => {
    const { articleHeadings } = await import('@/lib/core/speech.core');
    const ids = articleHeadings('## Dados\n\nx\n\n## Dados\n\ny').map((h) => h.id);
    expect(new Set(ids).size).toBe(2);
  });
});
