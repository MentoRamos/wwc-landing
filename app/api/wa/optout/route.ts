import { adminClient } from '@/lib/supabase/admin';
import { optoutBodySchema, recordWaOptout } from '@/lib/evento/wa';
import { readWorkerRequest } from '@/lib/evento/wa-http';

/**
 * Uma resposta que chegou no +1 (`phone` pode ser o JID). Só um SAIR de
 * verdade vira saída; o resto devolve `optout: false`. O texto não fica
 * gravado nem vai para log.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const read = await readWorkerRequest(request, optoutBodySchema);
  if (!read.ok) return read.response;

  try {
    const outcome = await recordWaOptout(adminClient(), read.body);
    return Response.json({ ok: true, ...outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erro';
    if (message === 'telefone ilegível') return Response.json({ ok: false }, { status: 400 });
    console.error('[wa/optout] falhou', { error: message });
    return Response.json({ ok: false }, { status: 500 });
  }
}
