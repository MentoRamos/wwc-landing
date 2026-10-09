// ww-wa-worker — sends the Imersão post-purchase WhatsApp messages from the
// +1 (Evolution instance `ww` on ww-evolution-01).
//
// It PULLS work from the site over outbound HTTPS and talks to Evolution
// inside the docker network, so no port is opened anywhere. All business rules
// (who, when, quiet hours on the queue side, refunds, opt-outs) live on the
// site; this worker only knows "claim, send, report", plus local safety nets:
//
//   - WA_MODE=dry-run (default): claims with dry_run=true, never calls
//     Evolution, never reports a result.
//   - WA_MODE=allowlist: only numbers in WA_ALLOWLIST are sent; any other job
//     is reported `skipped` / `not_allowlisted`.
//   - WA_MODE=live: sends to whoever the site hands over.
//   - WA_ENABLED=false: never claims (local kill switch). The site has its
//     own kill switch (an empty claim).
//   - 20–45 s between sends, local daily cap, pause after 3 failed sends in a
//     row, no claim while the instance is not `open`.
//   - Quiet hours (21:30–08:00 America/Sao_Paulo): only `t0` is sent. Any
//     other step that arrives anyway is held: not sent and not reported, so
//     the lease expires and the site marks it `unknown` for a human.
//
// Logs are single JSON lines with job id and status only. Never phone, name,
// message text or any credential.

const MODES = new Set(['dry-run', 'allowlist', 'live']);
const TZ = 'America/Sao_Paulo';

function digits(s) {
  return String(s ?? '').replace(/\D/g, '');
}

function int(v, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function hhmm(v, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v ?? '').trim());
  if (!m) return fallback;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function loadConfig(env) {
  const mode = (env.WA_MODE || 'dry-run').trim();
  if (!MODES.has(mode)) throw new Error(`WA_MODE must be one of ${[...MODES].join(', ')}`);
  if (!env.WA_WORKER_TOKEN) throw new Error('WA_WORKER_TOKEN is required');
  if (!env.WA_API_BASE) throw new Error('WA_API_BASE is required');
  if (!env.EVOLUTION_API_KEY) throw new Error('EVOLUTION_API_KEY is required');

  const allowlist = String(env.WA_ALLOWLIST ?? '')
    .split(',')
    .map(digits)
    .filter(Boolean);
  if (mode === 'allowlist' && allowlist.length === 0) {
    throw new Error('WA_MODE=allowlist needs at least one number in WA_ALLOWLIST');
  }

  return {
    mode,
    enabled: String(env.WA_ENABLED ?? 'true').trim().toLowerCase() !== 'false',
    token: env.WA_WORKER_TOKEN,
    apiBase: env.WA_API_BASE.replace(/\/+$/, ''),
    evolutionUrl: (env.EVOLUTION_URL || 'http://ww-evolution:8080').replace(/\/+$/, ''),
    evolutionKey: env.EVOLUTION_API_KEY,
    instance: env.EVOLUTION_INSTANCE || 'ww',
    allowlist,
    pollMs: int(env.WA_POLL_MS, 60_000),
    gapMinMs: int(env.WA_GAP_MIN_MS, 20_000),
    gapMaxMs: int(env.WA_GAP_MAX_MS, 45_000),
    backoffMaxMs: int(env.WA_BACKOFF_MAX_MS, 15 * 60_000),
    pauseMs: int(env.WA_PAUSE_MS, 30 * 60_000),
    maxConsecutiveFailures: int(env.WA_MAX_CONSECUTIVE_FAILURES, 3),
    dailyCap: int(env.WA_DAILY_CAP, 150),
    quietStart: hhmm(env.WA_QUIET_START, 21 * 60 + 30),
    quietEnd: hhmm(env.WA_QUIET_END, 8 * 60),
    typingDelayMs: int(env.WA_TYPING_DELAY_MS, 1_200),
    httpTimeoutMs: int(env.WA_HTTP_TIMEOUT_MS, 20_000),
  };
}

/** Minutes since midnight and civil date, both in São Paulo. */
function spClock(ms) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function isQuiet(ms, start, end) {
  const { minutes } = spClock(ms);
  return start > end ? minutes >= start || minutes < end : minutes >= start && minutes < end;
}

export function createWorker({ config, fetch, now = Date.now, random = Math.random, sleep, log }) {
  const wait = sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const emit = (evt, fields = {}) => log(JSON.stringify({ t: new Date(now()).toISOString(), evt, ...fields }));

  let claimFailures = 0;
  let sendFailures = 0;
  let pausedUntil = 0;
  let sentDay = '';
  let sentToday = 0;

  const gap = () => Math.round(config.gapMinMs + random() * (config.gapMaxMs - config.gapMinMs));

  async function http(url, { method = 'GET', headers = {}, body } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.httpTimeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timer);
    }
  }

  const site = (path, body) =>
    http(`${config.apiBase}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.token}` },
      body,
    });
  const evo = (path, body) =>
    http(`${config.evolutionUrl}${path}/${config.instance}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { apikey: config.evolutionKey },
      body,
    });

  async function report(result) {
    try {
      const r = await site('/api/wa/result', result);
      emit('result', { job: result.id, status: result.status, reason: result.reason, http: r.status });
    } catch (e) {
      // The lease will expire and the site marks the job `unknown`: at most
      // once, never a second copy on WhatsApp.
      emit('result_error', { job: result.id, status: result.status, err: e?.name ?? 'error' });
    }
  }

  function countSent() {
    const { date } = spClock(now());
    if (date !== sentDay) {
      sentDay = date;
      sentToday = 0;
    }
    return sentToday;
  }

  async function handle(job, quiet) {
    const id = typeof job?.id === 'string' || typeof job?.id === 'number' ? String(job.id) : null;
    const phone = digits(job?.phone);
    const text = typeof job?.text === 'string' ? job.text : '';
    const step = typeof job?.step_key === 'string' ? job.step_key : '';
    if (!id) {
      emit('job_invalid', { reason: 'no_id' });
      return 'none';
    }
    if (!phone || !text.trim()) {
      await report({ id, status: 'failed', reason: 'invalid_job' });
      return 'none';
    }
    if (config.mode === 'dry-run') {
      emit('dry_run', { job: id, step });
      return 'none';
    }
    if (quiet && step !== 't0') {
      emit('quiet_hold', { job: id, step });
      return 'none';
    }
    if (config.mode === 'allowlist' && !config.allowlist.includes(phone)) {
      await report({ id, status: 'skipped', reason: 'not_allowlisted' });
      return 'none';
    }

    const check = await evo('/chat/whatsappNumbers', { numbers: [phone] });
    const entry = Array.isArray(check.data) ? check.data[0] : null;
    if (!check.ok || !entry) {
      sendFailures += 1;
      await report({ id, status: 'failed', reason: `lookup_http_${check.status}` });
      return 'failed';
    }
    if (entry.exists === false) {
      await report({ id, status: 'no_whatsapp' });
      return 'none';
    }
    const jid = typeof entry.jid === 'string' && entry.jid ? entry.jid : phone;

    const sent = await evo('/message/sendText', { number: jid, text, delay: config.typingDelayMs });
    if (!sent.ok) {
      sendFailures += 1;
      await report({ id, status: 'failed', reason: `send_http_${sent.status}` });
      return 'failed';
    }
    sendFailures = 0;
    countSent();
    sentToday += 1;
    const messageId = sent.data?.key?.id;
    await report({
      id,
      status: 'sent',
      wa_jid: jid,
      ...(typeof messageId === 'string' ? { message_id: messageId } : {}),
    });
    return 'sent';
  }

  async function tick() {
    if (!config.enabled) {
      emit('disabled');
      return { sleepMs: config.pollMs, reason: 'disabled' };
    }
    if (now() < pausedUntil) {
      return { sleepMs: Math.min(config.pollMs, pausedUntil - now()), reason: 'paused' };
    }
    if (sendFailures >= config.maxConsecutiveFailures) {
      pausedUntil = now() + config.pauseMs;
      sendFailures = 0;
      emit('paused', { minutes: Math.round(config.pauseMs / 60_000) });
      return { sleepMs: config.pollMs, reason: 'paused' };
    }
    if (config.mode !== 'dry-run' && countSent() >= config.dailyCap) {
      emit('daily_cap', { cap: config.dailyCap });
      return { sleepMs: config.pollMs, reason: 'daily_cap' };
    }

    if (config.mode !== 'dry-run') {
      try {
        const st = await evo('/instance/connectionState');
        const state = st.data?.instance?.state;
        if (state !== 'open') {
          emit('instance_not_open', { state: typeof state === 'string' ? state : null, http: st.status });
          return { sleepMs: config.pollMs, reason: 'instance_not_open' };
        }
      } catch (e) {
        emit('instance_error', { err: e?.name ?? 'error' });
        return { sleepMs: config.pollMs, reason: 'instance_not_open' };
      }
    }

    const quiet = isQuiet(now(), config.quietStart, config.quietEnd);
    let claim;
    try {
      claim = await site('/api/wa/claim', {
        limit: 1,
        mode: config.mode,
        dry_run: config.mode === 'dry-run',
        quiet,
      });
    } catch (e) {
      claim = { ok: false, status: 0, err: e?.name ?? 'error' };
    }
    if (!claim.ok) {
      claimFailures += 1;
      const sleepMs = Math.min(config.backoffMaxMs, config.pollMs * 2 ** (claimFailures - 1));
      emit('claim_error', { http: claim.status, err: claim.err, backoff_s: Math.round(sleepMs / 1000) });
      return { sleepMs, reason: 'claim_error' };
    }
    claimFailures = 0;

    const jobs = Array.isArray(claim.data?.jobs) ? claim.data.jobs : [];
    if (jobs.length === 0) return { sleepMs: config.pollMs, reason: 'idle' };
    emit('claimed', { n: jobs.length, mode: config.mode });

    let lastSent = false;
    for (let i = 0; i < jobs.length; i++) {
      if (lastSent) await wait(gap());
      let outcome;
      try {
        outcome = await handle(jobs[i], quiet);
      } catch (e) {
        sendFailures += 1;
        emit('job_error', { job: jobs[i]?.id != null ? String(jobs[i].id) : null, err: e?.name ?? 'error' });
        outcome = 'failed';
      }
      lastSent = outcome === 'sent';
    }
    return { sleepMs: lastSent ? gap() : config.pollMs, reason: lastSent ? 'sent' : 'handled' };
  }

  return { tick };
}

export async function main(env = process.env) {
  const config = loadConfig(env);
  const log = (line) => process.stdout.write(`${line}\n`);
  const worker = createWorker({ config, fetch: globalThis.fetch, log });
  log(JSON.stringify({ t: new Date().toISOString(), evt: 'start', mode: config.mode, enabled: config.enabled }));

  let stopping = false;
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      stopping = true;
      log(JSON.stringify({ t: new Date().toISOString(), evt: 'stop', sig }));
      process.exit(0);
    });
  }
  while (!stopping) {
    let r;
    try {
      r = await worker.tick();
    } catch (e) {
      // Last line of defense: nothing thrown inside a tick may kill the loop.
      log(JSON.stringify({ t: new Date().toISOString(), evt: 'tick_error', err: e?.name ?? 'error' }));
      r = { sleepMs: config.pollMs };
    }
    await new Promise((res) => setTimeout(res, r.sleepMs));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    process.stderr.write(`${JSON.stringify({ evt: 'fatal', msg: String(e?.message ?? e) })}\n`);
    process.exit(1);
  });
}
