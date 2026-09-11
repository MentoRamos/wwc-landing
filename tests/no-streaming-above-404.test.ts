import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * A `loading.tsx` anywhere above a page that calls `notFound()` turns that
 * refusal into an HTTP 200.
 *
 * The Next docs say it plainly: "When streaming, a 200 status code will be
 * returned... Because the response headers have already been sent to the
 * client, the status code of the response cannot be updated." The page still
 * *renders* the 404, so the bug is invisible in a browser — it only shows up
 * to a crawler, an uptime check, an analytics tool, or a test.
 *
 * We hit exactly this on /biblioteca/[slug], where the 404 is the refusal: an
 * unentitled member asking for a replay must get the same answer as someone
 * asking for a slug that does not exist. It answered 200 with a 404 page.
 *
 * So the rule is enforced here rather than remembered. It reads the app
 * directory rather than a list, because a list would go stale the first time
 * someone adds a route.
 */
const APP = fileURLToPath(new URL('../app', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Route-group folders like `(app)` and dynamic ones like `[slug]` are the
 *  same URL segment for this purpose — what matters is the nesting. */
const segmentsOf = (file: string) => relative(APP, file).split('/').slice(0, -1);

const files = walk(APP);

const callsNotFound = files
  .filter((f) => /\/(page|layout)\.tsx$/.test(f))
  .filter((f) => /\bnotFound\(\)/.test(readFileSync(f, 'utf8')));

const loadingDirs = files
  .filter((f) => f.endsWith('/loading.tsx'))
  .map((f) => segmentsOf(f));

describe('no streaming boundary above a page that refuses with notFound()', () => {
  it('finds the pages that refuse with notFound(), so this test is not vacuous', () => {
    // If this ever hits zero the suite below proves nothing, and someone
    // should find out why rather than enjoy a green tick.
    expect(callsNotFound.length).toBeGreaterThan(0);
  });

  it.each(callsNotFound)('%s streams no 200 before its refusal', (file) => {
    const segments = segmentsOf(file);
    const isPage = file.endsWith('/page.tsx');

    const offenders = loadingDirs.filter((dir) => {
      // A loading.tsx wraps the *children* of its own segment: a page in the
      // same folder is inside the boundary, but that folder's own layout is
      // not — which is why /admin/acessos can keep its skeleton while the
      // refusal lives in app/admin/layout.tsx, one level up.
      const wrapsPage = dir.every((part, i) => segments[i] === part);
      const strictlyAbove = dir.length < segments.length;
      return isPage ? wrapsPage : strictlyAbove && wrapsPage;
    });

    expect(offenders.map((d) => d.join('/'))).toEqual([]);
  });
});
