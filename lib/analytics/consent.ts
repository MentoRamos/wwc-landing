import { useSyncExternalStore } from 'react';

/**
 * The consent contract for the Meta Pixel on `/imersao`.
 *
 * This is the exact same contract kauaramos.com already runs (see
 * `~/Projects/wealth-wellness-protocol/landing-kauaramos/assets/pixel.js`):
 * one localStorage key, three outcomes. `/imersao` reuses the key on purpose
 * — it is served on the same origin through the funnel repo's rewrite, so a
 * visitor who already answered on the main site is never asked twice, and a
 * "não" given here also holds if they later browse the rest of the site.
 *
 * Pure and DOM-free so it is unit-testable without a browser: the caller
 * reads `localStorage.getItem(CONSENT_STORAGE_KEY)` and hands the raw string
 * (or null) to `decideConsent`.
 */
export const CONSENT_STORAGE_KEY = 'kr_consent';

/**
 * Fired on `window` whenever a stored decision changes (accept or decline),
 * so a component that already computed its own visibility from consent (the
 * sticky buy bar hides while the banner is up) can re-check without needing
 * a shared React context between two independent leaf components.
 */
export const CONSENT_DECIDED_EVENT = 'kr-consent-decided';

export type ConsentDecision = 'load' | 'skip' | 'ask';

export function decideConsent(stored: string | null): ConsentDecision {
  if (stored === 'sim') return 'load';
  if (stored === 'nao') return 'skip';
  return 'ask';
}

function readStoredConsent(): ConsentDecision {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    stored = null;
  }
  return decideConsent(stored);
}

function subscribeToConsentChanges(onChange: () => void): () => void {
  window.addEventListener(CONSENT_DECIDED_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_DECIDED_EVENT, onChange);
}

/** Always `null` on the server and on the very first client paint: neither
 *  one has access to `localStorage`, and rendering the same thing on both
 *  avoids a hydration mismatch. `useSyncExternalStore` re-reads it right
 *  after hydration, and again on `CONSENT_DECIDED_EVENT` — no `useEffect`
 *  calling `setState` just to copy an external value into local state. */
function getServerConsent(): null {
  return null;
}

/**
 * One hook, shared by every component that needs to know (or react to) the
 * visitor's consent choice — the pixel loader and the sticky buy bar, which
 * hides while the consent banner is up so the two never fight for the same
 * strip of a phone screen.
 */
export function useConsentDecision(): ConsentDecision | null {
  return useSyncExternalStore(subscribeToConsentChanges, readStoredConsent, getServerConsent);
}

/** Call after writing a new choice to localStorage, so every subscriber
 *  (this tab only — the browser's own `storage` event only fires on
 *  others) re-reads it immediately. */
export function announceConsentDecided(): void {
  window.dispatchEvent(new Event(CONSENT_DECIDED_EVENT));
}
