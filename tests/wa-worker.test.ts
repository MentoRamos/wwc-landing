import { describe, expect, it } from 'vitest';

// The worker is plain Node (no build step) so the droplet runs the same file
// these tests import.
import { createWorker, loadConfig } from '../ops/ww-wa-worker/worker.mjs';

const SITE = 'https://site.test';
const EVO = 'http://evolution.test:8080';
const PHONE = '5562999990001';
const OTHER = '5511988887777';
const TEXT = 'Oi Maria, aqui é o Kauã Ramos. Texto secreto da mensagem.';

type Call = { url: string; method: string; body: unknown; headers: Record<string, string> };

type Job = { id: string; phone: string; text: string; step_key: string };

/**
 * One fake fetch standing in for both sides: the site (`/api/wa/*`) and the
 * Evolution API. Every call is recorded so a test can assert on what was
 * (and, more importantly, what was NOT) called.
 */
function fakeNet(opts: {
  claim?: () => { status: number; body?: unknown } | Error;
  jobs?: Job[];
  exists?: boolean;
  state?: string;
  sendStatus?: number;
}) {
  const calls: Call[] = [];
  let served = false;
  const fetch = async (url: string, init: RequestInit = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({
      url,
      method: init.method ?? 'GET',
      body,
      headers: (init.headers ?? {}) as Record<string, string>,
    });
    const json = (status: number, payload: unknown) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
      });

    if (url === `${SITE}/api/wa/claim`) {
      if (opts.claim) {
        const r = opts.claim();
        if (r instanceof Error) throw r;
        return json(r.status, r.body ?? {});
      }
      const jobs = served ? [] : (opts.jobs ?? []);
      served = true;
      return json(200, { jobs });
    }
    if (url === `${SITE}/api/wa/result`) return json(200, { ok: true });
    if (url === `${EVO}/instance/connectionState/ww`) {
      return json(200, { instance: { instanceName: 'ww', state: opts.state ?? 'open' } });
    }
    if (url === `${EVO}/chat/whatsappNumbers/ww`) {
      const numbers = (body as { numbers: string[] }).numbers;
      return json(
        200,
        numbers.map((n) => ({
          exists: opts.exists ?? true,
          jid: `${n}@s.whatsapp.net`,
          number: n,
        })),
      );
    }
    if (url === `${EVO}/message/sendText/ww`) {
      return json(opts.sendStatus ?? 201, { key: { id: 'MSGID1' } });
    }
    return json(404, { error: 'not found' });
  };
  const to = (path: string) => calls.filter((c) => c.url.endsWith(path));
  return { fetch, calls, to };
}

function setup(env: Record<string, string>, net: ReturnType<typeof fakeNet>, nowIso = '2026-10-10T15:00:00Z') {
  const logs: string[] = [];
  const config = loadConfig({
    WA_WORKER_TOKEN: 'site-token-xyz',
    WA_API_BASE: SITE,
    EVOLUTION_URL: EVO,
    EVOLUTION_API_KEY: 'evo-key',
    ...env,
  });
  let now = new Date(nowIso).getTime();
  const worker = createWorker({
    config,
    fetch: net.fetch as unknown as typeof globalThis.fetch,
    now: () => now,
    random: () => 0.5,
    sleep: async (ms: number) => {
      now += ms;
    },
    log: (line: string) => logs.push(line),
  });
  return {
    worker,
    logs,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const job = (over: Partial<Job> = {}): Job => ({
  id: 'job-1',
  phone: PHONE,
  text: TEXT,
  step_key: 't0',
  ...over,
});

describe('loadConfig', () => {
  it('defaults to dry-run', () => {
    const c = loadConfig({ WA_WORKER_TOKEN: 't', WA_API_BASE: SITE, EVOLUTION_API_KEY: 'k' });
    expect(c.mode).toBe('dry-run');
    expect(c.enabled).toBe(true);
  });

  it('refuses an unknown mode instead of guessing', () => {
    expect(() =>
      loadConfig({ WA_WORKER_TOKEN: 't', WA_API_BASE: SITE, EVOLUTION_API_KEY: 'k', WA_MODE: 'yolo' }),
    ).toThrow(/WA_MODE/);
  });

  it('refuses to start without the site token', () => {
    expect(() => loadConfig({ WA_API_BASE: SITE, EVOLUTION_API_KEY: 'k' })).toThrow(/WA_WORKER_TOKEN/);
  });

  it('refuses allowlist mode with an empty allowlist', () => {
    expect(() =>
      loadConfig({ WA_WORKER_TOKEN: 't', WA_API_BASE: SITE, EVOLUTION_API_KEY: 'k', WA_MODE: 'allowlist' }),
    ).toThrow(/WA_ALLOWLIST/);
  });

  it('normalizes the allowlist to digits', () => {
    const c = loadConfig({
      WA_WORKER_TOKEN: 't',
      WA_API_BASE: SITE,
      EVOLUTION_API_KEY: 'k',
      WA_MODE: 'allowlist',
      WA_ALLOWLIST: '+55 (62) 99999-0001, 5511988887777',
    });
    expect(c.allowlist).toEqual(['5562999990001', '5511988887777']);
  });
});

describe('dry-run', () => {
  it('never calls sendText, never touches Evolution, never reports a result', async () => {
    const net = fakeNet({ jobs: [job()] });
    const { worker } = setup({}, net);
    await worker.tick();
    expect(net.to('/api/wa/claim')).toHaveLength(1);
    expect(net.to('/api/wa/claim')[0].body).toMatchObject({ dry_run: true, mode: 'dry-run' });
    expect(net.calls.filter((c) => c.url.startsWith(EVO))).toHaveLength(0);
    expect(net.to('/api/wa/result')).toHaveLength(0);
  });

  it('sends the Bearer token to the site', async () => {
    const net = fakeNet({ jobs: [] });
    const { worker } = setup({}, net);
    await worker.tick();
    expect(net.to('/api/wa/claim')[0].headers.authorization).toBe('Bearer site-token-xyz');
  });
});

describe('allowlist', () => {
  it('refuses a number outside the list: no sendText, result skipped', async () => {
    const net = fakeNet({ jobs: [job({ phone: OTHER })] });
    const { worker } = setup({ WA_MODE: 'allowlist', WA_ALLOWLIST: PHONE }, net);
    await worker.tick();
    expect(net.to('/message/sendText/ww')).toHaveLength(0);
    expect(net.to('/chat/whatsappNumbers/ww')).toHaveLength(0);
    expect(net.to('/api/wa/result')[0].body).toEqual({
      id: 'job-1',
      status: 'skipped',
      reason: 'not_allowlisted',
    });
  });

  it('sends to a number on the list, to the jid Evolution resolved', async () => {
    const net = fakeNet({ jobs: [job()] });
    const { worker } = setup({ WA_MODE: 'allowlist', WA_ALLOWLIST: PHONE }, net);
    await worker.tick();
    const sent = net.to('/message/sendText/ww');
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatchObject({ number: `${PHONE}@s.whatsapp.net`, text: TEXT });
    expect(net.to('/api/wa/result')[0].body).toMatchObject({
      id: 'job-1',
      status: 'sent',
      wa_jid: `${PHONE}@s.whatsapp.net`,
    });
  });
});

describe('live', () => {
  it('whatsappNumbers exists:false becomes no_whatsapp and nothing is sent', async () => {
    const net = fakeNet({ jobs: [job()], exists: false });
    const { worker } = setup({ WA_MODE: 'live' }, net);
    await worker.tick();
    expect(net.to('/message/sendText/ww')).toHaveLength(0);
    expect(net.to('/api/wa/result')[0].body).toEqual({ id: 'job-1', status: 'no_whatsapp' });
  });

  it('waits 20 to 45 s after a send (throttle)', async () => {
    const net = fakeNet({ jobs: [job()] });
    const { worker } = setup({ WA_MODE: 'live' }, net);
    const r = await worker.tick();
    expect(r.sleepMs).toBeGreaterThanOrEqual(20_000);
    expect(r.sleepMs).toBeLessThanOrEqual(45_000);
  });

  it('does not claim while the instance is not open', async () => {
    const net = fakeNet({ jobs: [job()], state: 'close' });
    const { worker } = setup({ WA_MODE: 'live' }, net);
    await worker.tick();
    expect(net.to('/api/wa/claim')).toHaveLength(0);
    expect(net.to('/message/sendText/ww')).toHaveLength(0);
  });

  it('a failed send is reported failed', async () => {
    const net = fakeNet({ jobs: [job()], sendStatus: 500 });
    const { worker } = setup({ WA_MODE: 'live' }, net);
    await worker.tick();
    expect(net.to('/api/wa/result')[0].body).toMatchObject({ id: 'job-1', status: 'failed' });
  });

  it('pauses itself after 3 failed sends in a row', async () => {
    let n = 0;
    const net = fakeNet({
      claim: () => ({ status: 200, body: { jobs: [job({ id: `job-${++n}` })] } }),
      sendStatus: 500,
    });
    const { worker, advance } = setup({ WA_MODE: 'live' }, net);
    for (let i = 0; i < 3; i++) {
      const r = await worker.tick();
      advance(r.sleepMs);
    }
    const r = await worker.tick();
    expect(r.reason).toBe('paused');
    expect(net.to('/message/sendText/ww')).toHaveLength(3);
  });

  it('holds a non-t0 job in quiet hours: not sent, not reported', async () => {
    const net = fakeNet({ jobs: [job({ step_key: 'videos' })] });
    // 23:00 in São Paulo
    const { worker } = setup({ WA_MODE: 'live' }, net, '2026-10-11T02:00:00Z');
    await worker.tick();
    expect(net.to('/api/wa/claim')[0].body).toMatchObject({ quiet: true });
    expect(net.to('/message/sendText/ww')).toHaveLength(0);
    expect(net.to('/api/wa/result')).toHaveLength(0);
  });

  it('still sends t0 in quiet hours (it is the purchase confirmation)', async () => {
    const net = fakeNet({ jobs: [job()] });
    const { worker } = setup({ WA_MODE: 'live' }, net, '2026-10-11T02:00:00Z');
    await worker.tick();
    expect(net.to('/message/sendText/ww')).toHaveLength(1);
  });

  it('stops at the local daily cap', async () => {
    let n = 0;
    const net = fakeNet({ claim: () => ({ status: 200, body: { jobs: [job({ id: `j${++n}` })] } }) });
    const { worker, advance } = setup({ WA_MODE: 'live', WA_DAILY_CAP: '2' }, net);
    for (let i = 0; i < 2; i++) advance((await worker.tick()).sleepMs);
    const r = await worker.tick();
    expect(r.reason).toBe('daily_cap');
    expect(net.to('/message/sendText/ww')).toHaveLength(2);
  });
});

describe('kill switch', () => {
  it('WA_ENABLED=false never claims', async () => {
    const net = fakeNet({ jobs: [job()] });
    const { worker } = setup({ WA_ENABLED: 'false', WA_MODE: 'live' }, net);
    const r = await worker.tick();
    expect(r.reason).toBe('disabled');
    expect(net.calls).toHaveLength(0);
  });

  it('an empty claim is idle, polling at the normal interval', async () => {
    const net = fakeNet({ claim: () => ({ status: 200, body: { jobs: [], enabled: false } }) });
    const { worker } = setup({ WA_MODE: 'live' }, net);
    const r = await worker.tick();
    expect(r.reason).toBe('idle');
    expect(r.sleepMs).toBe(60_000);
  });
});

describe('site errors never take the loop down', () => {
  it('404 backs off, growing, and does not throw', async () => {
    const net = fakeNet({ claim: () => ({ status: 404 }) });
    const { worker, advance } = setup({}, net);
    const a = await worker.tick();
    advance(a.sleepMs);
    const b = await worker.tick();
    expect(a.reason).toBe('claim_error');
    expect(b.sleepMs).toBeGreaterThan(a.sleepMs);
    expect(b.sleepMs).toBeLessThanOrEqual(15 * 60_000);
  });

  it('401 backs off and does not throw', async () => {
    const net = fakeNet({ claim: () => ({ status: 401 }) });
    const { worker } = setup({}, net);
    const r = await worker.tick();
    expect(r.reason).toBe('claim_error');
  });

  it('a network error backs off and does not throw', async () => {
    const net = fakeNet({ claim: () => new Error('ECONNREFUSED') });
    const { worker } = setup({}, net);
    const r = await worker.tick();
    expect(r.reason).toBe('claim_error');
  });

  it('backoff resets after a good claim', async () => {
    let fail = true;
    const net = fakeNet({ claim: () => (fail ? { status: 404 } : { status: 200, body: { jobs: [] } }) });
    const { worker, advance } = setup({}, net);
    advance((await worker.tick()).sleepMs);
    advance((await worker.tick()).sleepMs);
    fail = false;
    advance((await worker.tick()).sleepMs);
    fail = true;
    const r = await worker.tick();
    expect(r.sleepMs).toBe(60_000);
  });
});

describe('logs', () => {
  it('never carry phone, text or name, only job id and status', async () => {
    const net = fakeNet({ jobs: [job(), job({ id: 'job-2', phone: OTHER })] });
    const { worker, logs } = setup({ WA_MODE: 'allowlist', WA_ALLOWLIST: PHONE }, net);
    await worker.tick();
    const all = logs.join('\n');
    expect(all).toContain('job-1');
    expect(all).not.toContain(PHONE);
    expect(all).not.toContain(OTHER);
    expect(all).not.toContain('Maria');
    expect(all).not.toContain('secreto');
    expect(all).not.toContain('evo-key');
    expect(all).not.toContain('site-token-xyz');
  });
});
