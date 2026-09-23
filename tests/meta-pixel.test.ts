import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearQueue,
  getMetaPixelId,
  initializePixelStub,
  queueOrSendEvent,
} from '@/lib/analytics/meta-pixel';

describe('getMetaPixelId', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_PIXEL_ID = ORIGINAL;
  });

  it('has no default pixel: nothing loads until the owner sets his own', () => {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    expect(getMetaPixelId()).toBeNull();
  });

  it('lets a dedicated pixel override the default via env', () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '999999999999999';
    expect(getMetaPixelId()).toBe('999999999999999');
  });

  it('treats a blank env value as unset', () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '   ';
    expect(getMetaPixelId()).toBeNull();
  });
});

/**
 * The pixel loads only after consent, so any event fired before that (a
 * click while the banner is still up) has nowhere to go yet. It sits in an
 * in-memory queue instead of being dropped on the floor or sent guessing —
 * flushed once the real `window.fbq` exists, discarded on refusal or reload.
 */
describe('queueOrSendEvent / clearQueue', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearQueue();
  });

  it('sends straight through when window.fbq already exists', () => {
    const fbq = vi.fn();
    vi.stubGlobal('window', { fbq });

    queueOrSendEvent('InitiateCheckout', { value: 97 });

    expect(fbq).toHaveBeenCalledWith('track', 'InitiateCheckout', { value: 97 });
  });

  it('uses trackCustom for custom events', () => {
    const fbq = vi.fn();
    vi.stubGlobal('window', { fbq });

    queueOrSendEvent('ScrollDepth', { percent: 50 }, true);

    expect(fbq).toHaveBeenCalledWith('trackCustom', 'ScrollDepth', { percent: 50 });
  });

  it('queues instead of sending when there is no fbq yet, then flushes once it appears', () => {
    vi.stubGlobal('window', {});
    queueOrSendEvent('InitiateCheckout', { value: 97 });

    const fbq = vi.fn();
    vi.stubGlobal('window', { fbq });
    queueOrSendEvent('ScrollDepth', { percent: 25 }, true); // flushes the pending queue too

    expect(fbq).toHaveBeenNthCalledWith(1, 'track', 'InitiateCheckout', { value: 97 });
    expect(fbq).toHaveBeenNthCalledWith(2, 'trackCustom', 'ScrollDepth', { percent: 25 });
  });

  it('clearQueue drops anything pending, e.g. on a "só o essencial" refusal', () => {
    vi.stubGlobal('window', {});
    queueOrSendEvent('InitiateCheckout', { value: 97 });
    clearQueue();

    const fbq = vi.fn();
    vi.stubGlobal('window', { fbq });
    queueOrSendEvent('ScrollDepth', { percent: 25 }, true);

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith('trackCustom', 'ScrollDepth', { percent: 25 });
  });
});

describe('initializePixelStub', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('defines a callable window.fbq, then fires init + PageView', () => {
    const win: { fbq?: (...args: unknown[]) => void } = {};
    vi.stubGlobal('window', win);

    initializePixelStub('1734438337865776');

    expect(typeof win.fbq).toBe('function');
  });

  it('is a no-op if window.fbq already exists (never double-inits)', () => {
    const existing = vi.fn();
    vi.stubGlobal('window', { fbq: existing });

    initializePixelStub('1734438337865776');

    expect((window as unknown as { fbq: unknown }).fbq).toBe(existing);
  });
});
