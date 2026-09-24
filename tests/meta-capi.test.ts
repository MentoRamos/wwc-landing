import { describe, expect, it, vi } from 'vitest';
import { sendCapiEvent } from '@/lib/meta/capi';

/**
 * The sender, with fetch injected. Nothing here reaches the network, and none
 * of it needs the real META_CAPI_ACCESS_TOKEN.
 */
const body = { event_name: 'Purchase', event_id: 'order-1' } as never;
const TOKEN = 'test-token-not-real';

const response = (status: number, json: unknown) =>
  new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } });

describe('sendCapiEvent', () => {
  it('posts the event to the pixel on the Graph API and reports ok', async () => {
    const fetchImpl = vi.fn(async () => response(200, { events_received: 1 }));
    const result = await sendCapiEvent(body, { pixelId: '123', token: TOKEN, fetchImpl });

    expect(result).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v21.0/123/events');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ data: [body], access_token: TOKEN });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns the Graph error code and subcode, and nothing of the message', async () => {
    const fetchImpl = vi.fn(async () =>
      response(400, { error: { message: 'Invalid parameter a@x.com', code: 100, error_subcode: 2804050 } }),
    );
    const result = await sendCapiEvent(body, { pixelId: '123', token: TOKEN, fetchImpl });
    expect(result).toEqual({ ok: false, code: '400:100:2804050' });
  });

  it('treats a 200 that received no event as a failure', async () => {
    const fetchImpl = vi.fn(async () => response(200, { events_received: 0 }));
    expect(await sendCapiEvent(body, { pixelId: '123', token: TOKEN, fetchImpl })).toEqual({
      ok: false,
      code: 'not-received',
    });
  });

  it('never throws: a network failure or a timeout becomes a code', async () => {
    const network = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await sendCapiEvent(body, { pixelId: '123', token: TOKEN, fetchImpl: network })).toEqual({
      ok: false,
      code: 'network',
    });

    const timeout = vi.fn(async () => {
      throw new DOMException('aborted', 'TimeoutError');
    });
    expect(await sendCapiEvent(body, { pixelId: '123', token: TOKEN, fetchImpl: timeout })).toEqual({
      ok: false,
      code: 'timeout',
    });
  });

  it('does not call out at all without a token or a pixel', async () => {
    const fetchImpl = vi.fn();
    expect(await sendCapiEvent(body, { pixelId: '123', token: '', fetchImpl })).toEqual({
      ok: false,
      code: 'no-token',
    });
    expect(await sendCapiEvent(body, { pixelId: null, token: TOKEN, fetchImpl })).toEqual({
      ok: false,
      code: 'no-pixel',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never logs the token or the body', async () => {
    const spies = [vi.spyOn(console, 'error'), vi.spyOn(console, 'info'), vi.spyOn(console, 'log'), vi.spyOn(console, 'warn')];
    const fetchImpl = vi.fn(async () => response(500, { error: { message: 'x', code: 1 } }));
    await sendCapiEvent(body, { pixelId: '123', token: TOKEN, fetchImpl });
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain('order-1');
    spies.forEach((spy) => spy.mockRestore());
  });
});
