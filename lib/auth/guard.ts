import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { serverClient } from '@/lib/supabase/server';
import { DEFAULT_AFTER_LOGIN, safeNextPath } from '@/lib/core/auth.core';

/**
 * Who is asking, or nobody.
 *
 * `getUser` rather than `getSession`: the session cookie is written by the
 * browser and its contents are not evidence of anything. `getUser` validates
 * the token with the auth server, so what comes back can be trusted.
 */
export async function currentUser(): Promise<User | null> {
  const supabase = await serverClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Signed in, or sent to the door with a way back.
 *
 * This is a gate on *identity*, not on entitlement. It answers "is anyone
 * there", never "may they see this" — the second question belongs to the
 * query, where RLS answers it and an empty result is the refusal.
 */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (user) return user;

  const store = await headers();
  const from = safeNextPath(store.get('x-pathname'));
  const next = from === DEFAULT_AFTER_LOGIN ? '' : `?next=${encodeURIComponent(from)}`;

  redirect(`/entrar${next}`);
}
