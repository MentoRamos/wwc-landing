import type { CapiEvent, SendResult } from '@/lib/core/meta-capi.core';

/**
 * Sends one event to Meta's Conversions API.
 *
 * It sits inside the Kiwify webhook, so it never throws and never waits long:
 * the sale and the idempotency record matter more than the measurement. What
 * comes back is a short code for `billing_events.result`, never Meta's error
 * message (it can echo the parameters it refused) and never the token.
 */
const GRAPH_VERSION = 'v21.0';
const TIMEOUT_MS = 5000;

export function capiAccessToken(): string {
  return process.env.META_CAPI_ACCESS_TOKEN?.trim() ?? '';
}

export async function sendCapiEvent(
  event: CapiEvent,
  options: { pixelId: string | null; token: string; fetchImpl?: typeof fetch },
): Promise<SendResult> {
  const { pixelId, token } = options;
  if (!token) return { ok: false, code: 'no-token' };
  if (!pixelId) return { ok: false, code: 'no-pixel' };

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: [event], access_token: token }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const json = (await response.json().catch(() => null)) as {
      events_received?: number;
      error?: { code?: number; error_subcode?: number };
    } | null;

    if (!response.ok) {
      const parts = [response.status, json?.error?.code, json?.error?.error_subcode].filter(
        (part) => typeof part === 'number',
      );
      return { ok: false, code: parts.join(':') };
    }

    if (!json?.events_received) return { ok: false, code: 'not-received' };
    return { ok: true };
  } catch (error) {
    const name = (error as { name?: string })?.name;
    return { ok: false, code: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network' };
  }
}
