import { adminClient } from '@/lib/supabase/admin';
import { cronAuthorized } from '@/lib/cron-auth';
import { emailConfigured, sendEmail } from '@/lib/email/send';
import { dueFor, renderStep, type Member } from '@/lib/core/regua.core';
import { nextMeeting } from '@/lib/core/circle.core';

/**
 * Um tick da régua do Circle. Roda uma vez por dia.
 *
 * O que este arquivo faz e o núcleo não: fala com o banco, fala com o Resend e
 * decide o que acontece quando um dos dois falha. Quem recebe o quê já está
 * decidido em `regua.core`, sem I/O, e é por isso que os casos difíceis dele
 * têm teste.
 *
 * A ordem de cada envio:
 *
 *   1. RESERVA a vaga (`insert ... on conflict do nothing`). Se a linha não
 *      voltar, outra execução já pegou este envio e esta desiste. É a trava
 *      contra envio duplo, e ela é do banco: não depende de eu lembrar de
 *      conferir antes.
 *   2. Envia.
 *   3. Marca `sent`, ou marca `failed` com o motivo.
 *
 * Uma linha `failed` volta à fila no tick seguinte, porque a lista de "já
 * enviados" só conta `sent`.
 */
export const dynamic = 'force-dynamic';

// O teto gratuito do Resend é 100/dia. Estourar derruba a fila inteira, então
// corta antes e o resto volta amanhã.
const DAILY_CAP = 90;

export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  if (!emailConfigured()) {
    // 200, não 500: a Vercel repete um cron que falha, e repetir não vai
    // configurar a variável que falta. O que resolve é alguém ler isto.
    return Response.json({ ok: false, skipped: 'resend não configurado' });
  }

  const admin = adminClient();
  const now = new Date();
  const meeting = nextMeeting(now);

  const [{ data: rows, error }, { data: alreadySent }] = await Promise.all([
    admin
      .from('entitlements')
      .select('email_norm, email_raw, status, starts_at, expires_at, created_at, user_id')
      .eq('product', 'circle')
      .in('status', ['active', 'past_due']),
    admin.from('circle_emails').select('email_norm, step_key').eq('status', 'sent'),
  ]);

  if (error) {
    console.error('[cron/regua] não consegui ler os membros', { code: error.code });
    return Response.json({ ok: false, error: 'leitura falhou' }, { status: 502 });
  }

  const sentByEmail = new Map<string, Set<string>>();
  for (const row of alreadySent ?? []) {
    const set = sentByEmail.get(row.email_norm) ?? new Set<string>();
    set.add(row.step_key);
    sentByEmail.set(row.email_norm, set);
  }

  // O primeiro nome vem do perfil de quem já entrou. Quem ainda não logou
  // recebe o e-mail sem nome, que é melhor que não receber.
  const userIds = (rows ?? []).map((row) => row.user_id).filter(Boolean) as string[];
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] };

  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string | null]));

  let sent = 0;
  let failed = 0;
  let deferred = 0;
  // Quantos membros o tick olhou e quantos não tinham nada a receber. Sem
  // isto, "enviei zero" e "não achei ninguém" são a mesma resposta, e as duas
  // causas são muito diferentes: uma é a régua em dia, a outra é uma consulta
  // que não acha o que deveria.
  const candidates = (rows ?? []).length;
  let nothingDue = 0;
  let claimFailed = 0;
  let alreadyClaimed = 0;

  for (const row of rows ?? []) {
    const member: Member = {
      email_norm: row.email_norm,
      email_raw: row.email_raw,
      first_name: firstName(row.user_id ? nameById.get(row.user_id) : null),
      started_at: row.starts_at ?? row.created_at,
      expires_at: row.expires_at,
      status: row.status,
    };

    const step = dueFor(member, sentByEmail.get(member.email_norm) ?? new Set(), now, meeting);
    if (!step) {
      nothingDue += 1;
      continue;
    }

    if (sent >= DAILY_CAP) {
      deferred += 1;
      continue; // sem reservar: amanhã ele volta para a fila
    }

    // 1. A reserva. Sem `select` de checagem antes: a unique constraint é que
    //    decide, e conferir antes seria uma corrida entre duas execuções.
    const { data: claim, error: claimError } = await admin
      .from('circle_emails')
      .upsert(
        { email_norm: member.email_norm, step_key: step.key, status: 'pending' },
        { onConflict: 'email_norm,step_key', ignoreDuplicates: true },
      )
      .select('id')
      .maybeSingle();

    /**
     * Reserva que falha não é reserva que colidiu.
     *
     * A primeira versão descartava o erro e tratava os dois casos como "outra
     * execução pegou este envio". O tick então respondia zero enviados, zero
     * falhas e zero adiados, com candidato na fila — uma régua parada dizendo
     * que estava em dia. Um erro engolido aqui não atrasa um e-mail, ele
     * esconde que a régua inteira não funciona.
     */
    if (claimError) {
      console.error('[cron/regua] a reserva falhou', { code: claimError.code });
      claimFailed += 1;
      continue;
    }

    if (!claim) {
      alreadyClaimed += 1;
      continue; // outra execução pegou este envio
    }

    // 2. O envio.
    const rendered = renderStep(step, member, meeting);
    const result = await sendEmail(member.email_raw, rendered.subject, rendered.html);

    // 3. O desfecho. Nunca registra o corpo nem o endereço: o que fica é a
    //    chave do passo e o motivo da recusa.
    if (result.ok) {
      await admin
        .from('circle_emails')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', claim.id);
      sent += 1;
    } else {
      await admin
        .from('circle_emails')
        .update({ status: 'failed', error: result.error.slice(0, 300) })
        .eq('id', claim.id);
      failed += 1;
    }
  }

  console.log('[cron/regua] tick', { candidates, sent, failed, deferred, nothingDue, claimFailed, alreadyClaimed });
  return Response.json({
    ok: true,
    candidates,
    sent,
    failed,
    deferred,
    nothingDue,
    claimFailed,
    alreadyClaimed,
  });
}

function firstName(full: string | null | undefined): string | null {
  return full?.trim().split(/\s+/)[0] || null;
}
