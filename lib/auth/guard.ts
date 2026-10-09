import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
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

/**
 * Signed in *and* an admin, or the route does not exist.
 *
 * `notFound()` rather than a redirect on purpose: a redirect to the sign-in
 * page tells a stranger that `/admin/acessos` is a real address worth coming
 * back to. A 404 tells them nothing.
 *
 * This asks the database, through `is_admin()`, rather than reading a claim
 * off the session. `admin_users` is unreadable by everyone and membership is
 * only ever observed through that function — so there is no value in the
 * cookie for anyone to forge.
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  const supabase = await serverClient();

  const { data, error } = await supabase.rpc('is_admin');
  if (error || data !== true) notFound();

  return user;
}
