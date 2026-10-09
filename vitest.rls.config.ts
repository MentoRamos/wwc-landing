import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** The suites that need a real Postgres (RLS and the event automation). Requires Docker and a running `supabase start`. */
export default defineConfig({
  // The same `@/` alias the app uses, so a test imports a module by the
  // exact specifier the application code does.
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['tests/rls.test.ts', 'tests/evento-db.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
