import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  IMERSAO_CHECKOUT_URL,
  IMERSAO_SALES_CLOSE_AT,
  IMERSAO_SALES_CLOSED_MESSAGE,
  imersaoCtaHref,
  imersaoSalesOpen,
} from '@/lib/imersao';

/**
 * Sales close automatically when the event starts: Wednesday 28/10/2026,
 * 19h30 America/Sao_Paulo (-03:00). This suite is written before the
 * behavior exists (TDD): it should fail on `main` and pass once
 * `imersaoSalesOpen`/`imersaoCtaHref` learn about the close time and
 * page/StickyBuyBar/ImersaoAnalytics all consult it.
 */
const PAGE_PATH = join(process.cwd(), 'app/imersao/page.tsx');
const STICKY_PATH = join(process.cwd(), 'components/imersao/StickyBuyBar.tsx');
const ANALYTICS_PATH = join(process.cwd(), 'components/imersao/ImersaoAnalytics.tsx');
const page = () => readFileSync(PAGE_PATH, 'utf8');
const stickyBar = () => readFileSync(STICKY_PATH, 'utf8');
const analytics = () => readFileSync(ANALYTICS_PATH, 'utf8');

describe('IMERSAO_SALES_CLOSE_AT', () => {
  it('is Wednesday 28/10/2026, 19h30 America/Sao_Paulo (-03:00)', () => {
    expect(IMERSAO_SALES_CLOSE_AT.toISOString()).toBe('2026-10-28T22:30:00.000Z');
  });
});

describe('imersaoSalesOpen', () => {
  it('is open one second before close, in -03:00', () => {
    expect(imersaoSalesOpen(new Date('2026-10-28T19:29:59-03:00'))).toBe(true);
  });

  it('is closed exactly at close, in -03:00', () => {
    expect(imersaoSalesOpen(new Date('2026-10-28T19:30:00-03:00'))).toBe(false);
  });

  it('is open one second before close, expressed as the equivalent UTC instant', () => {
    expect(imersaoSalesOpen(new Date('2026-10-28T22:29:59.000Z'))).toBe(true);
  });

  it('is closed at close, expressed as the equivalent UTC instant', () => {
    expect(imersaoSalesOpen(new Date('2026-10-28T22:30:00.000Z'))).toBe(false);
  });

  it('is not fooled by a different UTC offset landing on the exact same instant', () => {
    // 16:30 at -06:00 is the same instant as 19:30 at -03:00.
    expect(imersaoSalesOpen(new Date('2026-10-28T16:30:00-06:00'))).toBe(false);
  });

  it('stays closed well after the event', () => {
    expect(imersaoSalesOpen(new Date('2026-11-01T00:00:00-03:00'))).toBe(false);
  });

  it('defaults to the real current time when called with no argument (test runs before 28/10/2026)', () => {
    expect(imersaoSalesOpen()).toBe(true);
  });
});

describe('imersaoCtaHref (sales close)', () => {
  it('still returns the live checkout right up to close', () => {
    expect(imersaoCtaHref(new Date('2026-10-28T19:29:59-03:00'))).toBe(IMERSAO_CHECKOUT_URL);
  });

  it('falls back to #ingresso at and after close', () => {
    expect(imersaoCtaHref(new Date('2026-10-28T19:30:00-03:00'))).toBe('#ingresso');
    expect(imersaoCtaHref(new Date('2026-11-01T00:00:00-03:00'))).toBe('#ingresso');
  });

  it('defaults to the real current time when called with no argument', () => {
    expect(imersaoCtaHref()).toBe(IMERSAO_CHECKOUT_URL);
  });
});

describe('/imersao respects sales close (ISR + client-side re-check)', () => {
  it('opts into ISR so the page can flip state without a new deploy', () => {
    expect(page()).toMatch(/export const revalidate = 60;?/);
  });

  it('the page imports and calls imersaoSalesOpen to decide what to render', () => {
    const source = page();
    expect(source).toMatch(/import\s*\{[^}]*imersaoSalesOpen[^}]*\}\s*from\s*'@\/lib\/imersao'/);
    expect(source).toContain('imersaoSalesOpen()');
  });

  it('shows the closed-sales message instead of a button in the #ingresso section', () => {
    const source = page();
    expect(source).toMatch(/import\s*\{[^}]*IMERSAO_SALES_CLOSED_MESSAGE[^}]*\}\s*from\s*'@\/lib\/imersao'/);
    expect(source).toContain('{IMERSAO_SALES_CLOSED_MESSAGE}');
  });

  it('the closed-sales message has no dash and no exclamation mark', () => {
    expect(IMERSAO_SALES_CLOSED_MESSAGE).not.toMatch(/[—–!]/);
  });

  it('the sticky mobile buy bar consults imersaoSalesOpen, so it can disappear after close', () => {
    const source = stickyBar();
    expect(source).toMatch(/import\s*\{[^}]*imersaoSalesOpen[^}]*\}\s*from\s*'@\/lib\/imersao'/);
    expect(source).toContain('imersaoSalesOpen()');
  });

  it('the analytics click handler re-checks imersaoSalesOpen with the client clock before touching href', () => {
    const source = analytics();
    expect(source).toMatch(/import\s*\{[^}]*imersaoSalesOpen[^}]*\}\s*from\s*'@\/lib\/imersao'/);

    const checkIndex = source.indexOf('imersaoSalesOpen()');
    const rewriteIndex = source.indexOf('mergeCheckoutUtm(');
    expect(checkIndex).toBeGreaterThan(-1);
    expect(rewriteIndex).toBeGreaterThan(-1);
    expect(checkIndex).toBeLessThan(rewriteIndex);

    // It must actually stop the click (stale-cache safety net), not just skip
    // the UTM rewrite silently.
    expect(source).toContain('preventDefault');
  });
});
