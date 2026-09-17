/**
 * How the Library shelf is assembled, with no database in sight.
 *
 * The page makes two reads. `content_catalog` returns every published item to
 * anyone signed in — titles and descriptions, never a `youtube_id` or a
 * `storage_path` — which is what lets the shelf show a locked replay without
 * leaking the thing the lock protects. `content_items` returns only the rows
 * this person may actually open, because RLS said so.
 *
 * Merging them is the whole job, and it has one rule: locked by default. An
 * item opens only when its id is explicitly in the entitled set, so a bug in
 * the second query costs somebody access they had rather than handing someone
 * access they never bought.
 */

import type { Product } from './admin.core';

export type ContentKind = 'pdf' | 'video';

export type CatalogItem = {
  id: string;
  slug: string;
  kind: ContentKind;
  collection: string;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  season: string | null;
  required_products: Product[];
  sort_order: number;
};

export type ShelfItem = CatalogItem & { locked: boolean };
export type Shelf = { collection: string; items: ShelfItem[] };

export function buildShelf(catalog: CatalogItem[], entitledIds: Set<string>): Shelf[] {
  const byCollection = new Map<string, ShelfItem[]>();

  for (const item of catalog) {
    const items = byCollection.get(item.collection) ?? [];
    // `has`, never a negation: an id absent for any reason stays locked.
    items.push({ ...item, locked: !entitledIds.has(item.id) });
    byCollection.set(item.collection, items);
  }

  return [...byCollection.entries()].map(([collection, items]) => ({
    collection,
    items: items.sort(
      (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'pt-BR'),
    ),
  }));
}

/** `1:05`, or `1:02:05` once there are hours. Empty when there is no duration. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '';

  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

export type ProgressRow = { position_seconds: number; completed_at: string | null };

/** Nothing left to watch inside the last few seconds of a recording. */
const TAIL_SECONDS = 15;

/**
 * Where a replay should start.
 *
 * Anything suspicious resolves to the beginning rather than to a guess: a
 * position past the end means the recording was replaced, and parking someone
 * on the credits of something they already finished is worse than restarting.
 */
export function resumePosition(
  progress: ProgressRow | null | undefined,
  durationSeconds: number | null | undefined,
): number {
  if (!progress) return 0;
  if (progress.completed_at) return 0;

  const at = Math.max(0, Math.floor(progress.position_seconds));
  if (durationSeconds === null || durationSeconds === undefined) return at;
  if (at >= durationSeconds - TAIL_SECONDS) return 0;

  return at;
}

/**
 * Quanto da gravação já foi vista, em 0-100.
 *
 * Deriva de `resumePosition` de propósito, em vez de refazer a conta. As duas
 * respondem à mesma pergunta em linguagens diferentes — uma para o player,
 * outra para o olho — e se discordarem a tela mente: uma barra em 98% num item
 * que, ao clicar, recomeça do zero é pior do que não mostrar barra nenhuma.
 * Toda regra de "isto não conta" (concluído, posição além do fim, duração
 * desconhecida) já está lá e não é reescrita aqui.
 */
export function progressPercent(
  progress: ProgressRow | null | undefined,
  durationSeconds: number | null | undefined,
): number {
  if (progress?.completed_at) return 100;
  if (!durationSeconds || durationSeconds <= 0) return 0;

  const at = resumePosition(progress, durationSeconds);
  if (at <= 0) return 0;

  return Math.min(100, Math.round((at / durationSeconds) * 100));
}
