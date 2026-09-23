/**
 * Meta Pixel wiring for /imersao.
 *
 * Reuses the same pixel account kauaramos.com already runs (see
 * ~/Projects/wealth-wellness-protocol/landing-kauaramos/assets/pixel.js),
 * so ad performance for this event lands in the same dataset as the rest of
 * the site instead of starting a second, disconnected pixel. Override with
 * NEXT_PUBLIC_META_PIXEL_ID (Vercel project wwc-landing, Production,
 * redeploy) only if this event ever needs its own, separate pixel — nothing
 * needs to be added there for the default to work.
 */
const DEFAULT_PIXEL_ID = '1734438337865776';

export function getMetaPixelId(): string {
  const fromEnv = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return fromEnv ? fromEnv : DEFAULT_PIXEL_ID;
}

/** The Meta Pixel JS SDK, loaded via next/script, never inlined. */
export const META_PIXEL_SCRIPT_URL = 'https://connect.facebook.net/en_US/fbevents.js';

type FbqArgs = [string, string, Record<string, unknown>?];
type FbqFn = ((...args: FbqArgs) => void) & {
  callMethod?: (...args: FbqArgs) => void;
  push?: FbqFn;
  loaded?: boolean;
  version?: string;
  queue?: FbqArgs[];
};

type PixelWindow = { fbq?: FbqFn; _fbq?: FbqFn };

function pixelWindow(): PixelWindow | undefined {
  return typeof window === 'undefined' ? undefined : (window as unknown as PixelWindow);
}

/**
 * Defines window.fbq as Meta's own stub (untyped by nature — this mirrors
 * the official base code, which mimics a third-party global we don't own)
 * if it does not exist yet, then fires init and the first PageView.
 *
 * Only ever called after explicit consent (see components/MetaPixel.tsx).
 * Idempotent: a second call after the real SDK script has loaded is a
 * no-op, because window.fbq already exists by then.
 */
export function initializePixelStub(pixelId: string): void {
  const w = pixelWindow();
  if (!w) return;
  if (w.fbq) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors Meta's own untyped snippet
  const n: any = (...args: FbqArgs) => {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  };
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];

  w.fbq = n;
  if (!w._fbq) w._fbq = n;

  n('init', pixelId);
  n('track', 'PageView');
}

type QueuedEvent = { name: string; data?: Record<string, unknown>; custom: boolean };

let queue: QueuedEvent[] = [];

function fbqAvailable(): boolean {
  const w = pixelWindow();
  return typeof w?.fbq === 'function';
}

/** Sends every queued event, in order, once window.fbq exists. No-op otherwise. */
export function flushQueue(): void {
  if (!fbqAvailable()) return;
  const pending = queue;
  queue = [];
  const w = pixelWindow();
  for (const event of pending) {
    w?.fbq?.(event.custom ? 'trackCustom' : 'track', event.name, event.data);
  }
}

/**
 * Records one analytics event. If the pixel is already loaded it goes out
 * immediately; otherwise it waits in memory — never guessed at, never sent
 * before consent — until flushQueue() runs (or the next call to this
 * function runs it), and is dropped for good by clearQueue() on refusal or
 * simply by the tab closing.
 */
export function queueOrSendEvent(name: string, data?: Record<string, unknown>, custom = false): void {
  queue.push({ name, data, custom });
  flushQueue();
}

/** Discards anything waiting — called when the visitor picks "Só o essencial". */
export function clearQueue(): void {
  queue = [];
}
