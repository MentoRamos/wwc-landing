'use server';

import { serverClient } from '@/lib/supabase/server';

/**
 * Saves where someone got to in a replay.
 *
 * Like every Server Action, this is a POST endpoint anyone can call, so it
 * trusts nothing it is handed. It writes with the *user's* client, and the
 * `progress_own` policy carries the real check in its WITH CHECK clause: the
 * row must be theirs, and the content must be something they may actually
 * open. Someone posting another person's id, or the id of a replay they never
 * bought, is refused by Postgres rather than by an `if` here.
 *
 * Failures are swallowed on purpose. This fires every few seconds in the
 * background while a person watches; a lost position is a small annoyance,
 * and an error surfaced over the video would be a bigger one.
 */
export async function saveProgress(
  contentItemId: string,
  positionSeconds: number,
  finished: boolean,
): Promise<void> {
  const supabase = await serverClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const position = Math.max(0, Math.floor(positionSeconds));
  if (!Number.isFinite(position)) return;

  await supabase.from('progress').upsert(
    {
      user_id: user.id,
      content_item_id: contentItemId,
      position_seconds: position,
      completed_at: finished ? new Date().toISOString() : null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,content_item_id' },
  );
}
