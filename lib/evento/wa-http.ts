import type { z } from 'zod';
import { cronAuthorized } from '@/lib/cron-auth';

/**
 * A porta das rotas do worker de WhatsApp: `Authorization: Bearer
 * $WA_WORKER_TOKEN` comparado em tempo constante (o mesmo `cronAuthorized`
 * do cron), corpo JSON pequeno e validado pelo zod. Sem token configurado a
 * resposta é 401 para todo mundo, inclusive o worker: fechado por padrão.
 *
 * Devolve o corpo validado, ou a `Response` de recusa pronta.
 */
const MAX_BYTES = 16 * 1024;

export async function readWorkerRequest<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ ok: true; body: z.infer<T> } | { ok: false; response: Response }> {
  if (!cronAuthorized(request.headers.get('authorization'), process.env.WA_WORKER_TOKEN)) {
    return { ok: false, response: Response.json({ ok: false }, { status: 401 }) };
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) {
    return { ok: false, response: Response.json({ ok: false }, { status: 413 }) };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false, response: Response.json({ ok: false }, { status: 400 }) };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { ok: false, response: Response.json({ ok: false }, { status: 400 }) };
  return { ok: true, body: parsed.data };
}
