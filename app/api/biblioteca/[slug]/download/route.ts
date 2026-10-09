import { createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';
import { serverClient } from '@/lib/supabase/server';

/**
 * Hands over a file, after the database has already said this person may have
 * it.
 *
 * The order is the whole design. First the row is read with the *user's* own
 * client, so `content_read_entitled` decides: no right, no row, and the route
 * ends in a 404 having touched nothing. Only then does the service role get
 * involved, and only to sign a URL for a path the policy already approved.
 *
 * Every refusal is a 404, never a 403 and never a redirect to the sign-in
 * page. A 403 tells someone that the file exists and is worth coming back
 * for; a redirect tells them the same thing more politely.
 *
 * The signed URL is never rendered into HTML anywhere — it is minted per
 * request, lives five minutes, and dies.
 */
const SIGNED_URL_TTL_SECONDS = 300;

/**
 * An IP is personal data. It is hashed only when there is a real salt to hash
 * it with — an unsalted SHA-256 of an IPv4 address is reversible by anyone
 * willing to spend an afternoon on it, and storing one while calling it
 * anonymised is worse than storing nothing.
 */
function hashedIp(request: Request): string | null {
  const salt = process.env.DOWNLOAD_IP_SALT?.trim();
  if (!salt) return null;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!ip) return null;

  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await serverClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFoundResponse();

  // The authorization. RLS returns the row only to someone holding one of the
  // products in `required_products`; everyone else gets nothing at all.
  const { data: item } = await supabase
    .from('content_items')
    .select('id, kind, storage_path')
    .eq('slug', slug)
    .maybeSingle();

  if (!item || item.kind !== 'pdf' || !item.storage_path) return notFoundResponse();

  const admin = adminClient();
  const { data: signed, error } = await admin.storage
    .from('library')
    .createSignedUrl(item.storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    // Deliberately does not echo the storage error: it carries the object path.
    console.error('[biblioteca] falha ao assinar URL', { slug, status: error?.name });
    return new Response('Não consegui preparar o download agora.', { status: 502 });
  }

  // Recorded with the service role because `authenticated` holds only `select`
  // on this table — nobody can write themselves a history, or erase one.
  await admin.from('download_events').insert({
    user_id: user.id,
    content_item_id: item.id,
    ip_hash: hashedIp(request),
    user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
  });

  redirect(signed.signedUrl);
}

function notFoundResponse() {
  return new Response('Não encontrado.', { status: 404 });
}
