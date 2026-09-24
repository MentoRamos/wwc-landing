import { adminClient } from '@/lib/supabase/admin';
import { claimBodySchema, claimWaJobs } from '@/lib/evento/wa';
import { readWorkerRequest } from '@/lib/evento/wa-http';

/**
 * O worker do ww-evolution-01 pede o que enviar. Contrato em
 * `ops/ww-wa-worker/README.md`; regras em `lib/evento/wa.ts` e no
 * `claim_wa_jobs`. `dry_run: true` (ou `mode: 'dry-run'`) não reserva nada.
 * `WA_ENABLED` diferente de `true` devolve `jobs: []`.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const read = await readWorkerRequest(request, claimBodySchema);
  if (!read.ok) return read.response;

  try {
    const { jobs } = await claimWaJobs(adminClient(), {
      limit: read.body.limit,
      mode: read.body.mode,
      dryRun: read.body.dry_run,
      quiet: read.body.quiet,
    });
    return Response.json({ jobs });
  } catch (error) {
    console.error('[wa/claim] falhou', { error: error instanceof Error ? error.message : 'erro' });
    return Response.json({ ok: false }, { status: 500 });
  }
}
