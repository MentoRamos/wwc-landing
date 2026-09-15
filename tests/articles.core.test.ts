import { describe, expect, it } from 'vitest';
import {
  articlePath,
  isPubliclyVisible,
  parseArticleInput,
  readingMinutes,
} from '@/lib/core/articles.core';

const NOW = new Date('2026-09-15T13:00:00Z');

const paragraph =
  'A maior revisão já feita sobre o assunto reuniu 107 estudos e 4,8 milhões de pessoas, ' +
  'e depois do ajuste o benefício do consumo moderado desapareceu por completo. ';

function valid(over: Record<string, unknown> = {}) {
  return {
    slug: 'taca-de-vinho-nunca-foi-remedio',
    title: 'A taça de vinho nunca foi remédio',
    dek: 'A proteção do consumo moderado sumiu quando corrigiram quem entrava no grupo de comparação.',
    body_md: `${paragraph.repeat(8)}\n\n## O erro na conta\n\n${paragraph.repeat(8)}`,
    sources: [
      {
        label: 'Zhao J, et al. JAMA Network Open, 2023.',
        url: 'https://doi.org/10.1001/jamanetworkopen.2023.6185',
      },
    ],
    topic: 'alcool',
    source_kit: '2026-09-14-alcool-dose-moderada',
    published_at: '2026-09-14T10:00:00-03:00',
    ...over,
  };
}

function refusal(input: unknown): string {
  const result = parseArticleInput(input, NOW);
  if (result.ok) throw new Error('era para recusar e aceitou');
  return result.message;
}

describe('parseArticleInput', () => {
  it('aceita um artigo bem formado e normaliza a data para ISO UTC', () => {
    const result = parseArticleInput(valid(), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.slug).toBe('taca-de-vinho-nunca-foi-remedio');
    expect(result.value.published_at).toBe('2026-09-14T13:00:00.000Z');
    expect(result.value.sources).toHaveLength(1);
  });

  it('sem data, publica agora', () => {
    const result = parseArticleInput(valid({ published_at: undefined }), NOW);
    expect(result.ok && result.value.published_at).toBe(NOW.toISOString());
  });

  it('apara espaço de título e linha fina, que o modelo às vezes deixa', () => {
    const result = parseArticleInput(valid({ title: '  Um título  ' }), NOW);
    expect(result.ok && result.value.title).toBe('Um título');
  });

  it('recusa corpo que não é objeto', () => {
    expect(refusal(null)).toMatch(/objeto/i);
    expect(refusal('texto')).toMatch(/objeto/i);
  });

  it('recusa slug com acento, caixa ou hífen nas pontas', () => {
    expect(refusal(valid({ slug: 'Taça-de-vinho' }))).toMatch(/slug/);
    expect(refusal(valid({ slug: '-vinho' }))).toMatch(/slug/);
    expect(refusal(valid({ slug: 'vinho--tinto' }))).toMatch(/slug/);
    expect(refusal(valid({ slug: 'a'.repeat(91) }))).toMatch(/slug/);
  });

  it('recusa título e linha fina fora do tamanho', () => {
    expect(refusal(valid({ title: 'x'.repeat(141) }))).toMatch(/title/);
    expect(refusal(valid({ dek: 'curta' }))).toMatch(/dek/);
  });

  it('recusa corpo curto demais para ser artigo', () => {
    expect(refusal(valid({ body_md: paragraph }))).toMatch(/body_md/);
  });

  it('recusa h1 no corpo: o título já é o h1 da página', () => {
    expect(refusal(valid({ body_md: `# Outro título\n\n${paragraph.repeat(10)}` }))).toMatch(
      /h1/,
    );
  });

  it('aceita ## e ### no corpo', () => {
    const body = `${paragraph.repeat(6)}\n\n## Seção\n\n### Sub\n\n${paragraph.repeat(6)}`;
    expect(parseArticleInput(valid({ body_md: body }), NOW).ok).toBe(true);
  });

  it('recusa HTML cru no corpo', () => {
    expect(refusal(valid({ body_md: `${paragraph.repeat(10)}<script>alert(1)</script>` }))).toMatch(
      /HTML/,
    );
    expect(refusal(valid({ body_md: `${paragraph.repeat(10)}<img src=x onerror=1>` }))).toMatch(
      /HTML/,
    );
  });

  it('não confunde sinal de menor com HTML', () => {
    const body = `${paragraph.repeat(10)} Risco <2 por cento e pressão < 130.`;
    expect(parseArticleInput(valid({ body_md: body }), NOW).ok).toBe(true);
  });

  it('recusa travessão em título, linha fina e corpo', () => {
    expect(refusal(valid({ title: 'Vinho — o mito' }))).toMatch(/travessão/);
    expect(refusal(valid({ dek: 'Uma linha fina longa o bastante — com travessão no meio.' }))).toMatch(
      /travessão/,
    );
    expect(refusal(valid({ body_md: `${paragraph.repeat(10)} e — no fim` }))).toMatch(/travessão/);
  });

  it('recusa meia-risca também, que é a mesma regra de voz', () => {
    const enDash = String.fromCharCode(0x2013);
    expect(refusal(valid({ title: `Estudos de 2020${enDash}2024` }))).toMatch(/travessão/);
  });

  it('recusa artigo sem fonte', () => {
    expect(refusal(valid({ sources: [] }))).toMatch(/sources/);
  });

  it('recusa fonte que não é https', () => {
    expect(refusal(valid({ sources: [{ label: 'x', url: 'http://exemplo.com' }] }))).toMatch(
      /https/,
    );
    expect(refusal(valid({ sources: [{ label: 'x', url: 'javascript:alert(1)' }] }))).toMatch(
      /https/,
    );
  });

  it('recusa data ilegível e data mais de um dia no futuro', () => {
    expect(refusal(valid({ published_at: 'ontem' }))).toMatch(/published_at/);
    expect(refusal(valid({ published_at: '2026-09-17T10:00:00-03:00' }))).toMatch(/published_at/);
  });

  it('ignora campo desconhecido em vez de gravá-lo', () => {
    const result = parseArticleInput(valid({ hidden_at: null, id: 'x' }), NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.value)).not.toContain('hidden_at');
  });
});

describe('readingMinutes', () => {
  it('conta 200 palavras por minuto, arredondando para cima', () => {
    expect(readingMinutes(Array(201).fill('palavra').join(' '))).toBe(2);
  });

  it('nunca devolve zero', () => {
    expect(readingMinutes('')).toBe(1);
  });

  it('não conta a sintaxe do markdown como palavra', () => {
    expect(readingMinutes('## Título\n\n- **um**\n- dois')).toBe(1);
  });
});

describe('isPubliclyVisible', () => {
  it('publicado no passado e não escondido aparece', () => {
    expect(isPubliclyVisible({ published_at: '2026-09-14T13:00:00Z', hidden_at: null }, NOW)).toBe(
      true,
    );
  });

  it('escondido não aparece', () => {
    expect(
      isPubliclyVisible(
        { published_at: '2026-09-14T13:00:00Z', hidden_at: '2026-09-15T10:00:00Z' },
        NOW,
      ),
    ).toBe(false);
  });

  it('agendado para depois não aparece', () => {
    expect(isPubliclyVisible({ published_at: '2026-09-16T13:00:00Z', hidden_at: null }, NOW)).toBe(
      false,
    );
  });
});

describe('articlePath', () => {
  it('mora dentro do Circle', () => {
    expect(articlePath('vo2-maximo')).toBe('/circle/artigos/vo2-maximo');
  });
});
