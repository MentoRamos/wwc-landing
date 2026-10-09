/**
 * O artigo que chega do cron, antes de virar linha no banco.
 *
 * Quem escreve é um modelo, todo dia às 10h, e ninguém revisa antes de ir ao
 * ar. Então este arquivo é a revisão: tudo que tornaria o artigo indefensável
 * ou a página quebrada é recusado aqui, com uma mensagem que o próprio cron
 * consegue ler e corrigir na mesma execução. Uma recusa vaga faria o cron
 * desistir; uma recusa que diz "travessão no dek" faz ele trocar o travessão.
 *
 * Sem banco e sem request, para que cada recusa tenha teste.
 */

import { z } from 'zod';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Travessão e meia-risca são regra de voz da marca (tests/copy.test.ts), e o
// travessão é também o tique mais reconhecível de texto gerado por modelo.
// Recusar aqui custa uma reescrita ao cron; deixar passar custa a voz do Kauã
// no próprio site dele. Por código, para o caractere não morar neste arquivo.
const DASHES = [String.fromCharCode(0x2014), String.fromCharCode(0x2013)];

// `# ` no começo de linha. `##` e `###` passam: o título do artigo já é o h1
// da página, e dois h1 quebram a leitura de quem navega por cabeçalho.
const H1 = /^#[ \t]/m;

// Uma tag de verdade começa com letra, `/` ou `!` logo depois do `<`. Isso
// deixa passar "risco <2 por cento" e "pressão < 130", que são texto comum
// num artigo de saúde. O renderizador também não interpreta HTML; esta
// recusa existe para o autor saber que escreveu algo que não vai aparecer.
const RAW_HTML = /<[a-zA-Z/!]/;

// Um dia de folga para o fuso: o cron grava 10h de São Paulo, e um relógio
// adiantado não pode fazer o artigo do dia ser recusado.
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

const trimmed = (field: string, min: number, max: number) =>
  z
    .string({ error: `${field} precisa ser texto` })
    .trim()
    .min(min, { error: `${field} precisa ter pelo menos ${min} caracteres` })
    .max(max, { error: `${field} pode ter no máximo ${max} caracteres` })
    .refine((value) => !DASHES.some((dash) => value.includes(dash)), {
      error: `travessão ou meia-risca em ${field}: troque por vírgula, dois-pontos, ponto ou "a"`,
    });

const source = z.object({
  label: z.string().trim().min(1, { error: 'fonte sem label' }).max(400),
  url: z
    .string()
    .trim()
    .max(600)
    .refine(isHttpsUrl, { error: 'toda fonte precisa de url https' }),
});

const schema = z.object({
  slug: z
    .string({ error: 'slug precisa ser texto' })
    .max(90, { error: 'slug pode ter no máximo 90 caracteres' })
    .regex(SLUG, { error: 'slug só com minúsculas sem acento, números e hífen entre palavras' }),
  title: trimmed('title', 5, 140),
  dek: trimmed('dek', 20, 300),
  body_md: trimmed('body_md', 1500, 40_000)
    .refine((value) => !H1.test(value), {
      error: 'h1 (# ) no body_md: use ## e ###, o título já é o h1 da página',
    })
    .refine((value) => !RAW_HTML.test(value), {
      error: 'HTML cru no body_md: use só markdown',
    }),
  sources: z
    .array(source, { error: 'sources precisa ser uma lista' })
    .min(1, { error: 'sources precisa de pelo menos 1 fonte' })
    .max(30, { error: 'sources pode ter no máximo 30 fontes' }),
  topic: z.string().trim().max(40).optional().nullable(),
  source_kit: z.string().trim().max(120).optional().nullable(),
  published_at: z.string().optional().nullable(),
});

export type ArticleSource = { label: string; url: string };

/**
 * A linha como o endpoint grava. `hidden_at` não está aqui de propósito.
 *
 * `published_at` só aparece quando o cron mandou uma data. Sem ela, a coluna
 * fica fora do upsert: na criação o banco usa `now()`, e no reenvio a data
 * original é preservada, em vez de o artigo antigo pular para o topo com a
 * data de hoje.
 */
export type ArticleInput = {
  slug: string;
  title: string;
  dek: string;
  body_md: string;
  sources: ArticleSource[];
  topic: string | null;
  source_kit: string | null;
  published_at?: string;
};

// Data com hora precisa dizer o fuso. "2026-09-14T10:00:00" viraria 10h UTC
// (7h em São Paulo) e "2026-09-14" viraria 21h do dia 13 aqui.
const HAS_ZONE = /T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;

export type ParseResult = { ok: true; value: ArticleInput } | { ok: false; message: string };

/**
 * Valida e normaliza. Campos desconhecidos são descartados, e isso importa:
 * `hidden_at` só o admin escreve, e um cron que mandasse `hidden_at: null`
 * republicaria um artigo que o Kauã tirou do ar.
 */
export function parseArticleInput(raw: unknown, now: Date): ParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, message: 'o corpo precisa ser um objeto JSON' };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    return { ok: false, message: `${where}${issue?.message ?? 'artigo inválido'}` };
  }

  const data = parsed.data;

  const value: ArticleInput = {
    slug: data.slug,
    title: data.title,
    dek: data.dek,
    body_md: data.body_md,
    sources: data.sources,
    topic: data.topic || null,
    source_kit: data.source_kit || null,
  };

  if (data.published_at) {
    if (!HAS_ZONE.test(data.published_at.trim())) {
      return { ok: false, message: 'published_at: data e hora com fuso, como 2026-09-14T10:00:00-03:00' };
    }
    const publishedAt = new Date(data.published_at);
    if (Number.isNaN(publishedAt.getTime())) {
      return { ok: false, message: 'published_at: data ilegível, use ISO 8601 com fuso' };
    }
    if (publishedAt.getTime() - now.getTime() > MAX_FUTURE_MS) {
      return { ok: false, message: 'published_at: mais de um dia no futuro' };
    }
    value.published_at = publishedAt.toISOString();
  }

  return { ok: true, value };
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Minutos de leitura, a 200 palavras por minuto. Conta palavra, não
 * sintaxe: `##`, `-` e `**` não são coisa que alguém lê.
 */
export function readingMinutes(markdown: string): number {
  const words = markdown
    .replace(/[#*_>`[\]()-]+/g, ' ')
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * A mesma regra da política `articles_public_read`, para as telas que já
 * têm a linha em mãos (o admin, que lê tudo, e precisa dizer o que o
 * público está vendo).
 */
export function isPubliclyVisible(
  row: { published_at: string; hidden_at: string | null },
  now: Date,
): boolean {
  return row.hidden_at === null && new Date(row.published_at).getTime() <= now.getTime();
}

export function articlePath(slug: string): string {
  return `/circle/artigos/${slug}`;
}
