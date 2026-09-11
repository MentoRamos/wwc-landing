import { adminClient } from '@/lib/supabase/admin';
import { readInterest } from '@/lib/core/interest.core';

/**
 * A raised hand, stored.
 *
 * This writes with the service role, and that is the whole design: `interest`
 * has no INSERT policy for anon, because a public insert policy on a lead
 * table is an open endpoint for anybody who reads the anon key out of the page
 * source. The payload has to survive `readInterest` before the privileged
 * client is ever constructed.
 *
 * Two things are deliberately not done here. Nothing from the body reaches a
 * log — it is a name, an email and a phone number, and the point of the table
 * is that those live in Postgres and nowhere else. And a duplicate is an
 * update rather than an error: somebody who taps twice because nothing
 * visibly happened is one lead, and the second post carries their corrected
 * number.
 */

/**
 * Naive flood protection, per warm instance.
 *
 * Best-effort by construction — serverless gives each instance its own memory,
 * so this slows a single attacker rather than stopping a distributed one. It
 * is here because the alternative is nothing, and because the thing being
 * protected is the table Kauã reads as his list of buyers.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const seen = new Map<string, number[]>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const hits = (seen.get(ip) ?? []).filter((at) => now - at < WINDOW_MS);
  hits.push(now);
  seen.set(ip, hits);

  // Unbounded growth would be a slow leak on a long-lived instance.
  if (seen.size > 5_000) seen.clear();

  return hits.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconhecido';
  if (tooMany(ip)) {
    return Response.json({ error: 'Muitas tentativas seguidas.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  const interest = readInterest(body);
  if (!interest) {
    return Response.json({ error: 'Confira o e-mail e tente de novo.' }, { status: 400 });
  }

  const { error } = await adminClient()
    .from('interest')
    .upsert(
      {
        email_norm: interest.email,
        product: interest.product,
        name: interest.name ?? null,
        whatsapp: interest.whatsapp ?? null,
        source: interest.source,
      },
      { onConflict: 'email_norm,product' },
    );

  if (error) {
    // The code and nothing else: a constraint violation echoes the offending
    // value back, and here that value is somebody's email address.
    console.error('[interesse] insert recusado. code=%s', error.code);
    return Response.json({ error: 'Não consegui guardar agora.' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
