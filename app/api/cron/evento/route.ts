import { adminClient } from '@/lib/supabase/admin';
import { cronAuthorized } from '@/lib/cron-auth';
import { runEmailTick } from '@/lib/evento/tick';

/**
 * O relógio dos e-mails da imersão. O `pg_cron` do Supabase chama por POST a
 * cada 5 minutos (`pg_net`, com o `CRON_SECRET` guardado no Vault); o cron
 * diário da Vercel chama por GET, como rede de segurança se o `pg_cron`
 * parar. Os dois rodam o mesmo tick, e o tick é seguro de rodar em paralelo:
 * cada job é reservado antes de sair.
 *
 * O que o tick faz: `lib/evento/tick.ts`. A resposta leva só contagens.
 */
export const dynamic = 'force-dynamic';

async function tick(request: Request) {
  if (!cronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    const email = await runEmailTick(adminClient());
    return Response.json({ ok: true, email });
  } catch (error) {
    // A mensagem pode citar dado de comprador: no log vai só o tipo.
    console.error('[cron/evento] falhou', { error: error instanceof Error ? error.name : 'erro' });
    return Response.json({ ok: false }, { status: 500 });
  }
}

export const GET = tick;
export const POST = tick;
