/**
 * Reading the Supabase configuration out of the environment, loudly.
 *
 * Every accessor here is a function rather than a module constant on purpose:
 * importing a module must never throw. A missing variable should surface when
 * something actually tries to talk to Supabase, with a message that says which
 * variable is missing, instead of collapsing a build or a page render into a
 * stack trace about `undefined`.
 */

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in ` +
        '(for the local stack, `supabase status` prints the values).',
    );
  }
  return trimmed;
}

/** Safe in the browser: the anon key only ever acts through RLS. */
export function publicSupabaseEnv(): { url: string; anonKey: string } {
  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

/** Never safe in the browser: this key ignores RLS entirely. */
export function serviceRoleKey(): string {
  return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** The event's own domain, empty until it is bought and pointed here. */
export function eventHost(): string | undefined {
  return process.env.EVENT_HOST?.trim() || undefined;
}
