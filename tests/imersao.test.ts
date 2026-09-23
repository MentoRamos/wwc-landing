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
const OG_IMAGE_PATH = join(process.cwd(), 'app/imersao/opengraph-image.tsx');
const STICKY_PATH = join(process.cwd(), 'components/imersao/StickyBuyBar.tsx');
const META_PIXEL_PATH = join(process.cwd(), 'components/MetaPixel.tsx');
const ANALYTICS_PATH = join(process.cwd(), 'components/imersao/ImersaoAnalytics.tsx');
const page = () => readFileSync(PAGE_PATH, 'utf8');
const ogImage = () => readFileSync(OG_IMAGE_PATH, 'utf8');
const stickyBar = () => readFileSync(STICKY_PATH, 'utf8');
const metaPixel = () => readFileSync(META_PIXEL_PATH, 'utf8');
const analytics = () => readFileSync(ANALYTICS_PATH, 'utf8');

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

  it('never references a logo or brand-mark asset, anywhere on /imersao', () => {
    expect(/logo/i.test(code(page()))).toBe(false);
    expect(/logo/i.test(code(ogImage()))).toBe(false);
    expect(/logo/i.test(code(stickyBar()))).toBe(false);
    expect(/logo/i.test(code(metaPixel()))).toBe(false);
    expect(/logo/i.test(code(analytics()))).toBe(false);
  });

  it('every CTA href is built from the checkout constant, not a literal URL', () => {
    const source = page();
    expect(source).toContain("import { IMERSAO_CHECKOUT_URL, imersaoCtaHref } from '@/lib/imersao'");

    // Masked, like the logo check: a doc comment explaining this exact rule
    // is allowed to mention what a broken `href={...}` would look like.
    //
    // `href={d.src}` (the depoimentos section's "see the print full-size"
    // zoom links) is excluded here on purpose: it points at a photo file,
    // not the checkout, and the social-proof describe block below asserts
    // that exact shape on its own.
    const pageHrefs = [...code(source).matchAll(/href=\{([^}]*)\}/g)]
      .map((m) => m[1].trim())
      .filter((href) => href !== 'd.src');
    // Hero, after Programação, section 7's price box, and the closing — the
    // design review added two mid-page CTAs on top of the original two.
    expect(pageHrefs.length).toBe(4);

    // The sticky mobile buy bar lives in its own client component, and it
    // calls imersaoCtaHref() itself instead of receiving `cta` as a prop:
    // a prop would still satisfy "not a literal URL" in spirit, but a direct
    // call keeps this exact source-scan test able to see it, the same way it
    // sees the page's own CTAs.
    const stickyHrefs = [...code(stickyBar()).matchAll(/href=\{([^}]*)\}/g)].map((m) => m[1].trim());
    expect(stickyHrefs.length).toBe(1);

    const hrefs = [...pageHrefs, ...stickyHrefs];
    expect(hrefs.length).toBe(5);
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

describe('/imersao link preview (Open Graph / Twitter)', () => {
  it('declares openGraph and twitter metadata for the page', () => {
    const source = page();
    expect(source).toContain('openGraph:');
    expect(source).toContain("type: 'website'");
    expect(source).toContain("locale: 'pt_BR'");
    expect(source).toContain('twitter:');
    expect(source).toContain("card: 'summary_large_image'");
  });

  it('ships a 1200x630 opengraph-image next to the page', () => {
    const source = ogImage();
    expect(source).toContain('width: 1200');
    expect(source).toContain('height: 630');
    expect(source).toContain("contentType = 'image/png'");
  });

  it('draws the OG card with the brand copy, no logo, and no invented urgency', () => {
    const source = ogImage();
    expect(source).toContain('Performance e Longevidade');
    expect(source).toContain('29 e 30/09');
    expect(source).toContain('R$ 97');
    expect(source).toContain('kaua-portrait-seated.jpg');
    expect(source).toContain('#0D0D0D');
    // No scarcity/urgency language invented for the card.
    expect(/vagas|últim|corr(a|endo)|apenas hoje/i.test(source)).toBe(false);
  });
});

describe('/imersao sticky mobile buy bar', () => {
  it('is a client component gated to mobile, with an accessible landmark', () => {
    const source = stickyBar();
    expect(source.trimStart().startsWith("'use client'")).toBe(true);
    expect(source).toContain('aria-label');
    expect(source).toContain('md:hidden');
  });

  it('shows the same single CTA text as the rest of the page', () => {
    expect(code(stickyBar())).toContain('GARANTIR MEU INGRESSO');
  });

  it('drives visibility off the hero CTA and the closing section via IntersectionObserver', () => {
    const source = stickyBar();
    expect(source).toContain('IntersectionObserver');
    expect(source).toContain('data-cta="hero"');
    expect(source).toContain("getElementById('ingresso')");
  });

  it('the page mounts the sticky bar exactly once', () => {
    expect([...page().matchAll(/<StickyBuyBar\s*\/>/g)]).toHaveLength(1);
  });
});

describe('/imersao tracking scaffold', () => {
  it('marks every page CTA with a data-cta attribute for the sticky bar and tracking to key off', () => {
    const hits = [...page().matchAll(/data-cta="[^"]+"/g)];
    expect(hits.length).toBe(4);
  });

  it('the pixel loader is a client component gated on consent, never rendering unconditionally', () => {
    const source = metaPixel();
    expect(source.trimStart().startsWith("'use client'")).toBe(true);
    expect(source).toContain('next/script');
    expect(source).toContain('useConsentDecision');
  });

  it('gates the pixel behind the same kr_consent key kauaramos.com already uses', () => {
    expect(metaPixel()).toContain('CONSENT_STORAGE_KEY');
    expect(readFileSync(join(process.cwd(), 'lib/analytics/consent.ts'), 'utf8')).toContain("'kr_consent'");
  });

  it('the analytics listener tracks InitiateCheckout on CTA clicks and ScrollDepth on scroll', () => {
    const source = analytics();
    expect(source.trimStart().startsWith("'use client'")).toBe(true);
    expect(source).toContain('InitiateCheckout');
    expect(source).toContain('ScrollDepth');
    expect(source).toContain('data-cta');
  });

  it('the page mounts the pixel loader and the analytics listener exactly once', () => {
    const source = page();
    expect([...source.matchAll(/<MetaPixel\s*\/>/g)]).toHaveLength(1);
    expect([...source.matchAll(/<ImersaoAnalytics\s*\/>/g)]).toHaveLength(1);
  });
});

describe('/imersao social proof (student prints)', () => {
  const STUDENT_NAMES = /tania|morita|renata|borr[aá]s|geraldo|lyla|chirico|alvicto|micaela|giselle|m[oô]nica|fernando|danilo|adriana|marcus/i;

  it('renders a testimonials section with real student prints from public/photos/depoimentos', () => {
    const source = code(page());
    expect(source).toContain('id="depoimentos"');
    const srcs = [...source.matchAll(/\/photos\/depoimentos\/[\w-]+\.jpg/g)].map((m) => m[0]);
    expect(srcs.length).toBeGreaterThanOrEqual(6);
    for (const src of srcs) {
      expect(() => readFileSync(join(process.cwd(), 'public', src))).not.toThrow();
    }
  });

  it('never names a student anywhere on the page (prints are anonymized)', () => {
    expect(STUDENT_NAMES.test(code(page()))).toBe(false);
  });

  it('adds no CTA/checkout link or invented numbers to the proof section; only zooms into the print itself', () => {
    const source = code(page());
    const section = source.slice(source.indexOf('id="depoimentos"'), source.indexOf('id="ingresso"'));
    // Only the visible text counts: Tailwind classes like w-[82vw] are not claims.
    const visible = section.replace(/className=(\{`[^`]*`\}|"[^"]*")/g, '');
    // No checkout CTA belongs in a proof section — not the shared helper,
    // not the button label.
    expect(visible).not.toMatch(/imersaoCtaHref/);
    expect(visible).not.toMatch(/GARANTIR/);
    // The only href allowed here opens the print itself in a new tab: `d.src`
    // is the exact same field the test above already proves lives under
    // public/photos/depoimentos and resolves to a real .jpg.
    const hrefs = [...visible.matchAll(/href=\{([^}]*)\}/g)].map((m) => m[1].trim());
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toBe('d.src');
    }
    expect(visible).not.toMatch(/\d+\s*(alunos|clientes|%)/i);
  });
});
