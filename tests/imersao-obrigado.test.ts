import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IMERSAO_GRUPO_WHATSAPP_URL } from '@/lib/imersao';
import { commentMask } from './helpers/source';

function code(source: string): string {
  const mask = commentMask(source);
  return [...source].filter((_, i) => !mask[i]).join('');
}

/**
 * `/imersao/obrigado` is where Kiwify sends the buyer after a paid ticket.
 * Kiwify's own thank-you step never fired our Purchase (the buyer left
 * straight for the WhatsApp group), so this page is the one place the sale
 * reaches our pixel. Source-scanning, like the rest of the suite.
 */
const PAGE_PATH = join(process.cwd(), 'app/imersao/obrigado/page.tsx');
const PURCHASE_PATH = join(process.cwd(), 'components/imersao/PurchaseEvent.tsx');
const page = () => readFileSync(PAGE_PATH, 'utf8');
const purchase = () => readFileSync(PURCHASE_PATH, 'utf8');

describe('/imersao/obrigado page', () => {
  it('points the main button at the event WhatsApp group from lib/imersao', () => {
    expect(IMERSAO_GRUPO_WHATSAPP_URL).toMatch(/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/);
    const source = code(page());
    expect(source).toContain('IMERSAO_GRUPO_WHATSAPP_URL');
    expect(source).not.toContain('chat.whatsapp.com');
  });

  it('is never indexed', () => {
    expect(page()).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  });

  it('mounts the consent-gated pixel and the Purchase event', () => {
    const source = page();
    expect(source).toContain('<MetaPixel');
    expect(source).toContain('<PurchaseEvent');
  });

  it('states the event dates', () => {
    const source = page();
    expect(source).toContain('28 e 29 de outubro');
    expect(source).toContain('19h30');
  });

  it('follows the copy rules: no em dash, no exclamation mark', () => {
    const source = code(page());
    expect(source).not.toContain('—');
    expect(source).not.toMatch(/[A-Za-zÀ-ú]!/);
  });
});

describe('PurchaseEvent', () => {
  it('is a client component that sends Purchase through the consent queue', () => {
    const source = purchase();
    expect(source.trimStart().startsWith("'use client'")).toBe(true);
    expect(source).toContain("queueOrSendEvent('Purchase'");
    expect(source).toContain("currency: 'BRL'");
  });

  it('fires at most once per browser session, so a reload is not a second sale', () => {
    expect(purchase()).toContain('sessionStorage');
  });
});
