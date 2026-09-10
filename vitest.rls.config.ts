import { defineConfig } from 'vitest/config';

/** The RLS suite only. Requires Docker and a running `supabase start`. */
export default defineConfig({
  test: {
    include: ['tests/rls.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
