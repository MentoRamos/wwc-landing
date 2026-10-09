import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { parseWaResult, recordWaResult } from '@/lib/evento/wa';
import { readWorkerRequest } from '@/lib/evento/wa-http';

/**
 * O worker conta o que aconteceu com um job que ele reservou. Idempotente:
 * relatar de novo devolve `outcome: 'noop'`. Job que não existe é 404.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const read = await readWorkerRequest(request, z.unknown());
  if (!read.ok) return read.response;

  const parsed = parseWaResult(read.body);
  if (!parsed.ok) return Response.json({ ok: false }, { status: 400 });

  try {
    const outcome = await recordWaResult(adminClient(), parsed.value);
    if (outcome === 'not_found') return Response.json({ ok: false, outcome }, { status: 404 });
    return Response.json({ ok: true, outcome });
  } catch (error) {
    console.error('[wa/result] falhou', { job: parsed.value.id, error: error instanceof Error ? error.message : 'erro' });
    return Response.json({ ok: false }, { status: 500 });
  }
}
