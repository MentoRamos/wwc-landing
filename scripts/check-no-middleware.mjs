import { existsSync } from 'node:fs';

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`. A leftover `middleware.ts`
 * still compiles and still type-checks, but it never runs: the Supabase session
 * silently stops being refreshed and people get logged out with nothing in the
 * logs. Fail the build instead.
 */
const offenders = [
  'middleware.ts',
  'middleware.js',
  'src/middleware.ts',
  'src/middleware.js',
].filter((path) => existsSync(path));

if (offenders.length > 0) {
  console.error(
    `\nFound ${offenders.join(', ')}. Next 16 only runs "proxy.ts" — rename it, or the session never refreshes.\n`
  );
  process.exit(1);
}
