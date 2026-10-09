/**
 * Ler um formulário de conteúdo, sem banco e sem request.
 *
 * A tabela `content_items` tem um CHECK que recusa pdf com `youtube_id` e
 * vídeo com `storage_path`. Montar a linha errada não dá erro aqui: dá
 * "violates check constraint content_items_payload_matches_kind" na cara de
 * quem só queria publicar um guia. Então a decisão de qual par de colunas
 * preencher mora neste arquivo, que é testável, e não espalhada pelo form.
 */

import { PRODUCTS, type Product } from './admin.core';

export const KINDS = ['pdf', 'video'] as const;
export type ContentKind = (typeof KINDS)[number];

/**
 * O slug vai para a URL da Biblioteca e para o `unique` da tabela. Acento e
 * caixa viram armadilha dos dois lados, então caem aqui.
 *
 * NFKD e não NFD: a decomposição canônica tira o acento mas deixa de pé os
 * caracteres de compatibilidade, e "Nº 2" viraria `n-2` — o `º` sumindo em
 * vez de virar `o`. A de compatibilidade resolve essa família inteira (`º`→o,
 * `²`→2, `ﬁ`→fi), que é exatamente o que um endereço quer.
 */
export function slugify(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * O que a pessoa cola é o que estava na barra do navegador, e a URL de watch
 * carrega `list`, `t` e `si` junto. Guardar a URL inteira numa coluna que o
 * player concatena produz um embed quebrado, então só o id de 11 caracteres
 * atravessa. Qualquer outra coisa é `undefined` — nunca uma string torta.
 */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYoutubeId(raw: string): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  if (YOUTUBE_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  const candidate =
    url.searchParams.get('v') ??
    // youtu.be/<id> e /embed/<id> guardam o id no último segmento.
    url.pathname.split('/').filter(Boolean).pop();

  return candidate && YOUTUBE_ID.test(candidate) ? candidate : undefined;
}

/**
 * `1:05`, `1:02:05` ou segundos puros — a contraparte de `formatDuration`.
 * Ilegível levanta erro em vez de virar zero: zero é uma duração válida que
 * faria `resumePosition` tratar tudo como "acabou".
 */
export function parseDuration(raw: string): number | null {
  const value = raw?.trim();
  if (!value) return null;

  const parts = value.split(':');
  if (parts.length > 3) throw new Error(`Duração ilegível: ${value}`);

  const numbers = parts.map((part) => {
    if (!/^\d+$/.test(part)) throw new Error(`Duração ilegível: ${value}`);
    return Number(part);
  });

  // Minutos e segundos passam de 59 só quando a pessoa errou o formato.
  if (numbers.length > 1 && numbers.slice(1).some((n) => n > 59)) {
    throw new Error(`Duração ilegível: ${value}`);
  }

  return numbers.reduce((total, n) => total * 60 + n, 0);
}

export const isPublished = (item: { published_at: string | null }) => item.published_at !== null;

export type ContentRow = {
  slug: string;
  kind: ContentKind;
  collection: string;
  title: string;
  description: string | null;
  storage_path: string | null;
  youtube_id: string | null;
  duration_seconds: number | null;
  season: string | null;
  required_products: Product[];
  published_at: string | null;
  sort_order: number;
};

export type ContentFormInput = {
  title?: string;
  slug?: string;
  collection?: string;
  kind?: string;
  description?: string;
  storage_path?: string;
  youtube_id?: string;
  duration?: string;
  season?: string;
  required_products?: string[];
  publish?: string;
  sort_order?: string;
};

export type ContentFormResult =
  | { ok: true; row: ContentRow }
  | { ok: false; message: string };

const isProduct = (value: string): value is Product =>
  (PRODUCTS as readonly string[]).includes(value);

export function readContentForm(input: ContentFormInput, now: Date): ContentFormResult {
  const title = (input.title ?? '').trim();
  if (!title) return { ok: false, message: 'O título não pode ficar vazio.' };

  const slug = slugify(input.slug?.trim() || title);
  if (!slug) {
    return { ok: false, message: 'Esse título não produz um endereço válido. Escreva um slug.' };
  }

  const collection = (input.collection ?? '').trim();
  if (!collection) return { ok: false, message: 'Diga a que prateleira isso pertence.' };

  const kind = input.kind as ContentKind;
  if (!KINDS.includes(kind)) return { ok: false, message: 'Escolha PDF ou gravação.' };

  const required = input.required_products ?? [];
  const unknown = required.filter((value) => !isProduct(value));
  if (unknown.length > 0) {
    return { ok: false, message: `Produto que não existe: ${unknown.join(', ')}.` };
  }

  /**
   * A falha silenciosa desta tela. O RLS libera o item com
   * `required_products && active_products()`, e um array vazio nunca casa com
   * nada — nem com quem pagou. O item apareceria na prateleira com um cadeado
   * que não abre para ninguém, e nada no banco diria o porquê.
   */
  if (required.length === 0) {
    return {
      ok: false,
      message: 'Escolha ao menos um produto: sem isso o item fica trancado até para quem pagou.',
    };
  }

  let duration: number | null;
  try {
    duration = parseDuration(input.duration ?? '');
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }

  // O CHECK do banco: cada tipo preenche a sua coluna e anula a outra.
  let storagePath: string | null = null;
  let youtubeId: string | null = null;

  if (kind === 'pdf') {
    storagePath = (input.storage_path ?? '').trim() || null;
    if (!storagePath) {
      return { ok: false, message: 'Um PDF precisa do caminho dele no bucket.' };
    }
  } else {
    youtubeId = parseYoutubeId(input.youtube_id ?? '') ?? null;
    if (!youtubeId) {
      return { ok: false, message: 'Cole o link ou o id do YouTube. Sem isso a gravação não toca.' };
    }
  }

  const sortOrder = Number(input.sort_order ?? 0);

  return {
    ok: true,
    row: {
      slug,
      kind,
      collection,
      title,
      description: (input.description ?? '').trim() || null,
      storage_path: storagePath,
      youtube_id: youtubeId,
      duration_seconds: duration,
      season: (input.season ?? '').trim() || null,
      required_products: required as Product[],
      published_at: input.publish ? now.toISOString() : null,
      sort_order: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
    },
  };
}
