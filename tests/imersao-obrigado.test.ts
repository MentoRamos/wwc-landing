import { existsSync, readFileSync } from 'node:fs';
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
 * Source-scanning, like the rest of the suite.
 *
 * The Purchase no longer fires here. The Kiwify webhook sends it to Meta's
 * Conversions API for every approved order, consent or not, and a browser
 * Purchase on top would count the same sale twice: this URL does not carry
 * the order id, so the two could never share the event_id Meta dedups on.
 */
const PAGE_PATH = join(process.cwd(), 'app/imersao/obrigado/page.tsx');
const PURCHASE_PATH = join(process.cwd(), 'components/imersao/PurchaseEvent.tsx');
const page = () => readFileSync(PAGE_PATH, 'utf8');

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

  it('mounts the consent-gated pixel for the PageView, and no browser Purchase', () => {
    const source = code(page());
    expect(source).toContain('<MetaPixel');
    expect(source).not.toContain('PurchaseEvent');
    expect(source).not.toContain("'Purchase'");
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

/**
 * Decisão do Kauã, 24/09: mesma troca de `/imersao` — a gravação deixou de
 * ser parte do ingresso. Quem chega aqui logo depois de comprar precisa ver
 * o replay (até domingo, 01/11, às 23h59) como o benefício, não a gravação.
 */
describe('/imersao/obrigado replay policy (24/09): the recording is no longer part of the ticket', () => {
  it('never promises the recording as something the ticket includes', () => {
    const source = code(page());
    expect(source).not.toMatch(/\bgravação\b/i);
  });

  it('states the replay deadline, Sunday 01/11 at 23h59', () => {
    const source = page();
    expect(source).toContain('replay');
    expect(source).toContain('até domingo, 01/11, às 23h59');
  });
});

describe('the browser Purchase', () => {
  it('is gone, because the server is the source of truth for sales', () => {
    expect(existsSync(PURCHASE_PATH)).toBe(false);
  });
});
