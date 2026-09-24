import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentMask } from './helpers/source';

/**
 * `/imersao/protocolo` needs its own link-preview card: without one, it
 * inherits `/imersao/opengraph-image.tsx` (28 e 29/10, ingresso R$ 97), which
 * is the wrong event for someone who already bought the imersão and is
 * looking at the follow-on offer. Same source-scanning approach as
 * `imersao.test.ts` uses for the sibling card.
 */
function code(source: string): string {
  const mask = commentMask(source);
  return [...source].filter((_, i) => !mask[i]).join('');
}

const OG_IMAGE_PATH = join(process.cwd(), 'app/imersao/protocolo/opengraph-image.tsx');
const TWITTER_IMAGE_PATH = join(process.cwd(), 'app/imersao/protocolo/twitter-image.tsx');
const PAGE_PATH = join(process.cwd(), 'app/imersao/protocolo/page.tsx');

const ogImage = () => readFileSync(OG_IMAGE_PATH, 'utf8');
const twitterImage = () => readFileSync(TWITTER_IMAGE_PATH, 'utf8');
const page = () => readFileSync(PAGE_PATH, 'utf8');

describe('/imersao/protocolo link preview (Open Graph / Twitter)', () => {
  it('ships its own opengraph-image, separate from /imersao', () => {
    expect(() => ogImage()).not.toThrow();
  });

  it('is a 1200x630 PNG', () => {
    const source = ogImage();
    expect(source).toContain('width: 1200');
    expect(source).toContain('height: 630');
    expect(source).toContain("contentType = 'image/png'");
  });

  it('shows the W&W Protocol eyebrow, the wearable headline and the footer, with no price', () => {
    const source = code(ogImage());
    expect(source).toMatch(/W&W Protocol/);
    expect(source).toContain('sua própria linha de base');
    expect(source).toContain('Acompanhamento individual com Kauã Ramos');
    expect(source).toContain('90 ou 180 dias');
    expect(/R\$\s?\d/.test(source)).toBe(false);
  });

  it('never uses an em dash or an exclamation mark', () => {
    const source = code(ogImage());
    expect(source).not.toContain('—');
    expect(source).not.toMatch(/!/);
  });

  it('never references a logo asset', () => {
    expect(/logo/i.test(code(ogImage()))).toBe(false);
  });

  it('reuses the same palette and display font as the /imersao card', () => {
    const source = ogImage();
    expect(source).toContain('#0D0D0D');
    expect(source).toContain('#C9A84C');
    expect(source).toContain('BodoniModa-500.ttf');
    expect(source).toContain("fontFamily: 'Bodoni'");
  });

  it('reads the font and the photo from disk, not over HTTP, like the sibling card', () => {
    const source = ogImage();
    expect(source).toContain("readFile(join(process.cwd(), 'assets/fonts/BodoniModa-500.ttf'))");
    expect(source).toMatch(/readFile\(join\(process\.cwd\(\), 'public\/photos\/[\w.-]+\.jpg'\)\)/);
  });

  it('also ships a twitter-image so the summary_large_image card has an image, not just the tag', () => {
    const source = twitterImage();
    expect(source).toMatch(/from ['"]\.\/opengraph-image['"]/);
    expect(source).toContain('alt');
    expect(source).toContain('size');
    expect(source).toContain('contentType');
    expect(source).toContain('default');
  });

  it('declares twitter.card as summary_large_image on the page, matching the file-convention image', () => {
    const source = page();
    expect(source).toContain("card: 'summary_large_image'");
  });
});
