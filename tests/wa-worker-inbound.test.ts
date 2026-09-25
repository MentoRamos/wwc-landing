import { describe, expect, it } from 'vitest';

// The SAIR path: Evolution posts every incoming message to the worker over the
// docker network; the worker forwards only a direct "SAIR" to the site. Group
// traffic and every other text stay on the droplet.
import { createWorker, inboundRoute, loadConfig, parseInbound } from '../ops/ww-wa-worker/worker.mjs';

const SITE = 'https://site.test';
const SECRET = 'inbound-secret-abc';
const PN = '556291731015@s.whatsapp.net';

type Call = { url: string; body: unknown; headers: Record<string, string> };

function upsert(over: {
  remoteJid?: string;
  fromMe?: boolean;
  text?: string | null;
  extended?: boolean;
  remoteJidAlt?: string;
  senderPn?: string;
  event?: string;
}) {
  const text = over.text === undefined ? 'SAIR' : over.text;
  const message =
    text === null ? { imageMessage: {} } : over.extended ? { extendedTextMessage: { text } } : { conversation: text };
  return {
    event: over.event ?? 'messages.upsert',
    instance: 'ww',
    data: {
      key: {
        remoteJid: over.remoteJid ?? PN,
        fromMe: over.fromMe ?? false,
        id: 'MSG1',
        ...(over.remoteJidAlt ? { remoteJidAlt: over.remoteJidAlt } : {}),
      },
      ...(over.senderPn ? { senderPn: over.senderPn } : {}),
      pushName: 'Maria Secreta',
      message,
    },
  };
}

describe('parseInbound', () => {
  it('a direct SAIR becomes the number and the text', () => {
    expect(parseInbound(upsert({}))).toEqual({ phone: '556291731015', text: 'SAIR' });
  });

  it('reads extendedTextMessage too, and accents or punctuation around it', () => {
    expect(parseInbound(upsert({ text: 'Sair.', extended: true }))).toEqual({ phone: '556291731015', text: 'Sair.' });
  });

  it('with an @lid chat, takes the real number from remoteJidAlt', () => {
    const out = parseInbound(upsert({ remoteJid: '123456789012345@lid', remoteJidAlt: PN }));
    expect(out).toEqual({ phone: '556291731015', text: 'SAIR' });
  });

  it('with an @lid chat and no remoteJidAlt, falls back to senderPn', () => {
    const out = parseInbound(upsert({ remoteJid: '123456789012345@lid', senderPn: PN }));
    expect(out).toEqual({ phone: '556291731015', text: 'SAIR' });
  });

  it('never sends the @lid itself as a number', () => {
    expect(parseInbound(upsert({ remoteJid: '123456789012345@lid' }))).toEqual({ skip: 'no_number' });
  });

  it('drops group messages, even a SAIR', () => {
    expect(parseInbound(upsert({ remoteJid: '120363000000000000@g.us' }))).toEqual({ skip: 'not_direct' });
  });

  it('drops status and newsletter traffic', () => {
    expect(parseInbound(upsert({ remoteJid: 'status@broadcast' }))).toEqual({ skip: 'not_direct' });
    expect(parseInbound(upsert({ remoteJid: '1203630@newsletter' }))).toEqual({ skip: 'not_direct' });
  });

  it('drops what the +1 itself sent', () => {
    expect(parseInbound(upsert({ fromMe: true }))).toEqual({ skip: 'from_me' });
  });

  it('drops ordinary conversation: only a SAIR leaves the droplet', () => {
    expect(parseInbound(upsert({ text: 'vou sair mais cedo hoje, tudo bem?' }))).toEqual({ skip: 'not_sair' });
    expect(parseInbound(upsert({ text: 'oi' }))).toEqual({ skip: 'not_sair' });
  });

  it('drops media without text and events that are not a new message', () => {
    expect(parseInbound(upsert({ text: null }))).toEqual({ skip: 'no_text' });
    expect(parseInbound(upsert({ event: 'connection.update' }))).toEqual({ skip: 'not_message' });
    expect(parseInbound(null)).toEqual({ skip: 'not_message' });
  });

  it('accepts the MESSAGES_UPSERT spelling as well', () => {
    expect(parseInbound(upsert({ event: 'MESSAGES_UPSERT' }))).toEqual({ phone: '556291731015', text: 'SAIR' });
  });
});

function setup(siteStatus = 200) {
  const calls: Call[] = [];
  const logs: string[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    calls.push({
      url,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      headers: (init.headers ?? {}) as Record<string, string>,
    });
    return new Response(JSON.stringify({ ok: siteStatus === 200, optout: true, canceled: 3 }), {
      status: siteStatus,
      headers: { 'content-type': 'application/json' },
    });
  };
  const config = loadConfig({
    WA_WORKER_TOKEN: 'site-token-xyz',
    WA_API_BASE: SITE,
    EVOLUTION_API_KEY: 'evo-key',
    WA_INBOUND_SECRET: SECRET,
  });
  const worker = createWorker({
    config,
    fetch: fetch as unknown as typeof globalThis.fetch,
    sleep: async () => {},
    log: (line: string) => logs.push(line),
  });
  return { worker, calls, logs, config };
}

describe('worker.inbound', () => {
  it('forwards a SAIR to /api/wa/optout with the worker token', async () => {
    const { worker, calls } = setup();
    await worker.inbound(upsert({}));
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${SITE}/api/wa/optout`);
    expect(calls[0].headers.authorization).toBe('Bearer site-token-xyz');
    expect(calls[0].body).toEqual({ phone: '556291731015', text: 'SAIR' });
  });

  it('does not call the site for anything else', async () => {
    const { worker, calls } = setup();
    await worker.inbound(upsert({ remoteJid: '120363000000000000@g.us' }));
    await worker.inbound(upsert({ text: 'bom dia' }));
    await worker.inbound(upsert({ fromMe: true }));
    expect(calls).toHaveLength(0);
  });

  it('a site error does not throw', async () => {
    const { worker, logs } = setup(500);
    await expect(worker.inbound(upsert({}))).resolves.toBeDefined();
    expect(logs.some((l) => l.includes('"optout"') && l.includes('"http":500'))).toBe(true);
  });

  it('a direct non-SAIR logs only the reason; group traffic logs nothing', async () => {
    const { worker, logs } = setup();
    await worker.inbound(upsert({ text: 'bom dia' }));
    await worker.inbound(upsert({ remoteJid: '120363000000000000@g.us', text: 'bom dia' }));
    await worker.inbound(upsert({ fromMe: true }));
    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0])).toMatchObject({ evt: 'inbound', skip: 'not_sair', chat: 'pn', number: true });
  });

  it('an @lid chat without the real number is visible in the log', async () => {
    const { worker, logs } = setup();
    await worker.inbound(upsert({ remoteJid: '123456789012345@lid', text: 'bom dia' }));
    await worker.inbound(upsert({ remoteJid: '123456789012345@lid', remoteJidAlt: PN, text: 'bom dia' }));
    expect(logs.map((l) => JSON.parse(l))).toMatchObject([
      { chat: 'lid', number: false },
      { chat: 'lid', number: true },
    ]);
    expect(logs.join('\n')).not.toMatch(/123456789012345|91731015/);
  });

  it('logs never carry number, name or text', async () => {
    const { worker, logs } = setup();
    await worker.inbound(upsert({}));
    await worker.inbound(upsert({ text: 'mensagem particular do aluno' }));
    const all = logs.join('\n');
    expect(all).not.toMatch(/556291731015|91731015|Maria|SAIR|particular/);
  });
});

describe('live needs SAIR', () => {
  const base = { WA_WORKER_TOKEN: 't', WA_API_BASE: SITE, EVOLUTION_API_KEY: 'k' };

  it('refuses WA_MODE=live without WA_INBOUND_SECRET', () => {
    expect(() => loadConfig({ ...base, WA_MODE: 'live' })).toThrow(/WA_INBOUND_SECRET/);
  });

  it('accepts live once the secret is there', () => {
    expect(loadConfig({ ...base, WA_MODE: 'live', WA_INBOUND_SECRET: SECRET }).mode).toBe('live');
  });

  it('dry-run and allowlist still start without it', () => {
    expect(loadConfig(base).inboundSecret).toBe('');
    expect(loadConfig({ ...base, WA_MODE: 'allowlist', WA_ALLOWLIST: '5562' }).mode).toBe('allowlist');
  });
});

describe('inboundRoute', () => {
  const path = `/evolution/${SECRET}`;

  it('accepts a POST on the secret path', () => {
    expect(inboundRoute({ method: 'POST', url: path, secret: SECRET })).toBe(202);
  });

  it('refuses a wrong or missing secret with 404', () => {
    expect(inboundRoute({ method: 'POST', url: '/evolution/nope', secret: SECRET })).toBe(404);
    expect(inboundRoute({ method: 'POST', url: '/evolution/', secret: SECRET })).toBe(404);
    expect(inboundRoute({ method: 'POST', url: '/', secret: SECRET })).toBe(404);
  });

  it('accepts Evolution appending the event name to the path', () => {
    expect(inboundRoute({ method: 'POST', url: `${path}/messages-upsert`, secret: SECRET })).toBe(202);
  });

  it('refuses other methods', () => {
    expect(inboundRoute({ method: 'GET', url: path, secret: SECRET })).toBe(405);
  });

  it('without a configured secret nothing is accepted', () => {
    expect(inboundRoute({ method: 'POST', url: '/evolution/', secret: '' })).toBe(404);
    expect(inboundRoute({ method: 'POST', url: '/evolution/undefined', secret: undefined })).toBe(404);
  });
});
