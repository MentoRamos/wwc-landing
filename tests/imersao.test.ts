import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IMERSAO_CHECKOUT_URL, imersaoCtaHref } from '@/lib/imersao';
import { commentMask } from './helpers/source';

/** Only the code, like `copy.test.ts` and `first-paint.test.ts` already do:
 *  a doc comment is allowed to explain the "no logo" rule in words. */
function code(source: string): string {
  const mask = commentMask(source);
  return [...source].filter((_, i) => !mask[i]).join('');
}

/**
 * `/imersao` is a source-scanning suite, like the rest of this repo's tests:
 * it reads the page's own text instead of rendering it, because that is what
 * the existing suite (copy.test.ts, layout.test.ts, card-link.test.ts) does
 * and the project has no DOM-rendering test setup (no jsdom, no
 * @testing-library) to add just for one page.
 */
const PAGE_PATH = join(process.cwd(), 'app/imersao/page.tsx');
const page = () => readFileSync(PAGE_PATH, 'utf8');

describe('/imersao', () => {
  it('renders exactly one h1, and it is the headline', () => {
    const source = page();
    const h1Matches = [...source.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];

    expect(h1Matches).toHaveLength(1);
    expect(h1Matches[0][1]).toContain('mais energia na reunião das 18h');
    expect(h1Matches[0][1]).toContain('HRV subindo no seu wearable');
  });

  it('shows R$ 97 at least three times', () => {
    const hits = page().match(/R\$\s?97/g) ?? [];
    expect(hits.length).toBeGreaterThanOrEqual(3);
  });

  it('never references a logo or brand-mark asset', () => {
    expect(/logo/i.test(code(page()))).toBe(false);
  });

  it('every CTA href is built from the checkout constant, not a literal URL', () => {
    const source = page();
    expect(source).toContain("import { IMERSAO_CHECKOUT_URL, imersaoCtaHref } from '@/lib/imersao'");

    // Masked, like the logo check: a doc comment explaining this exact rule
    // is allowed to mention what a broken `href={...}` would look like.
    const hrefs = [...code(source).matchAll(/href=\{([^}]*)\}/g)].map((m) => m[1].trim());
    // Hero, after Programação, section 7's price box, and the closing — the
    // design review added two mid-page CTAs on top of the original two.
    expect(hrefs.length).toBe(4);
    for (const href of hrefs) {
      // Either the call itself, or a local const bound to it near the top of
      // the component (the page also uses it for the button label price).
      expect(href === 'cta' || /imersaoCtaHref\(\)/.test(href)).toBe(true);
    }
  });

  it('resolves every CTA to #ingresso while the checkout URL is still null', () => {
    expect(IMERSAO_CHECKOUT_URL).toBeNull();
    expect(imersaoCtaHref()).toBe('#ingresso');
  });
});
