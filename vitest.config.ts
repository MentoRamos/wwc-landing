import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * `npm test` runs the pure unit suites and needs nothing installed.
 *
 * The RLS suite is excluded here on purpose: it asserts against a real
 * Postgres, so it needs Docker and `supabase start`. Run it with
 * `npm run test:rls`, and run it before shipping any change to a policy or to
 * a table's grants.
 */
export default defineConfig({
  // The same `@/` alias the app uses, so a test imports a module by the
  // exact specifier the application code does.
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    exclude: ['**/node_modules/**', '**/.next/**', 'tests/rls.test.ts'],
  },
});
