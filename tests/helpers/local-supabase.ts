import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Reads the running local Supabase stack's URL and keys.
 *
 * `supabase status -o env` is the only source: hardcoding the CLI's demo keys
 * works until the CLI rotates them and then fails with a confusing 401.
 */
let cached: { url: string; anonKey: string; serviceKey: string } | undefined;

export function localConfig() {
  if (cached) return cached;

  const raw = execFileSync('supabase', ['status', '-o', 'env'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const read = (key: string) => {
    const match = raw.match(new RegExp(`^${key}="?([^"\\n]+)"?$`, 'm'));
    if (!match) throw new Error(`supabase status did not report ${key}`);
    return match[1];
  };

  // Prefer the new-format keys. The CLI still exports the legacy JWT pair, but
  // once a project is on the new format those no longer verify — and the
  // hosted project is on the new format too, so testing with `sb_publishable_`
  // is the shape production actually uses.
  const readEither = (preferred: string, legacy: string) => {
    const match =
      raw.match(new RegExp(`^${preferred}="?([^"\\n]+)"?$`, 'm')) ??
      raw.match(new RegExp(`^${legacy}="?([^"\\n]+)"?$`, 'm'));
    if (!match) throw new Error(`supabase status did not report ${preferred} nor ${legacy}`);
    return match[1];
  };

  cached = {
    url: read('API_URL'),
    anonKey: readEither('PUBLISHABLE_KEY', 'ANON_KEY'),
    serviceKey: readEither('SECRET_KEY', 'SERVICE_ROLE_KEY'),
  };
  return cached;
}

/** Bypasses RLS. Used only to seed fixtures, never to assert access. */
export function serviceClient(): SupabaseClient {
  const { url, serviceKey } = localConfig();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Not signed in: exactly what a stranger with the public key can reach. */
export function anonClient(): SupabaseClient {
  const { url, anonKey } = localConfig();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const PASSWORD = 'rls-test-password-0910';

/**
 * Creates a confirmed user and returns a client authenticated as them.
 *
 * Production signs in with Google only; password is used here because the
 * policies are what is under test, not the identity provider.
 */
export async function signedInAs(email: string): Promise<SupabaseClient> {
  const admin = serviceClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createError && !/already/i.test(createError.message)) throw createError;

  const { url, anonKey } = localConfig();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return client;
}

export async function userIdFor(email: string): Promise<string> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single();
  if (error) throw error;
  return data.id as string;
}

/** A unique address per test run, so reruns never collide on the unique keys. */
export function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.local`;
}
