/**
 * Acceptance check for the Library, against a real server, a real Postgres and
 * real object storage.
 *
 * The question this answers is the one the plan named: does someone without
 * the right take a 404 on the download route? And the quieter companion to it
 * — does the shelf they *can* see leak the path to the file they cannot?
 *
 *   eval "$(supabase status -o env | sed 's/^/export /')"
 *   APP_URL=http://127.0.0.1:3001 SUPABASE_URL="$API_URL" node scripts/check-library.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const APP = process.env.APP_URL ?? 'http://127.0.0.1:3001';
const SUPA = process.env.SUPABASE_URL ?? process.env.API_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.ANON_KEY;
const SERVICE = process.env.SERVICE_ROLE_KEY;

if (!ANON || !SERVICE) {
  console.error('Faltam ANON_KEY e SERVICE_ROLE_KEY no ambiente.');
  process.exit(2);
}

const SLUG = 'o-minimo-inegociavel';
const STORAGE_PATH = 'guias/o-minimo-inegociavel.pdf';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const admin = createClient(SUPA, SERVICE, { auth: { persistSession: false } });
const password = 'senha-de-teste-forte-123';

async function makeUser(label, { product }) {
  const email = `library-check.${label}.${Date.now()}@teste.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Pessoa ${label}` },
  });
  if (error) throw error;

  if (product) {
    const { error: grantError } = await admin.from('entitlements').insert({
      email_norm: email,
      email_raw: email,
      product,
      source: 'manual',
      user_id: data.user.id,
    });
    if (grantError) throw grantError;
  }
  return { email, id: data.user.id };
}

async function cookiesFor(email) {
  const jar = new Map();
  const client = createServerClient(SUPA, ANON, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (toSet) => toSet.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return [...jar.entries()].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ');
}

const member = await makeUser('assinante', { product: 'circle' });
const stranger = await makeUser('sem-direito', { product: null });
const memberCookie = await cookiesFor(member.email);
const strangerCookie = await cookiesFor(stranger.email);

const get = (path, cookie) =>
  fetch(`${APP}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  });

// 1. The shelf is visible to both, and that is deliberate: a locked replay is
//    a sales argument. What must differ is what it carries.
const memberShelf = await get('/biblioteca', memberCookie);
const memberShelfHtml = await memberShelf.text();
check('the member sees the shelf', memberShelf.status === 200, String(memberShelf.status));
check('the shelf names the guide', memberShelfHtml.includes('O Mínimo Inegociável'));
check('the member is not shown a lock', !memberShelfHtml.includes('Bloqueado'));

const strangerShelf = await get('/biblioteca', strangerCookie);
const strangerShelfHtml = await strangerShelf.text();
check('someone with no product still sees the shelf', strangerShelf.status === 200);
check('and every item on it is locked', strangerShelfHtml.includes('Bloqueado'));

// 2. The shelf must never carry the thing the lock protects.
check(
  'no storage path is anywhere in the locked shelf',
  !strangerShelfHtml.includes(STORAGE_PATH) && !strangerShelfHtml.includes('.pdf'),
);
check(
  'the locked shelf does not even link to the item',
  !strangerShelfHtml.includes(`/biblioteca/${SLUG}`),
);

// 3. The item page. Nothing for someone without the right — the same 404 a
//    made-up slug gets, so the page never confirms the item exists.
const memberItem = await get(`/biblioteca/${SLUG}`, memberCookie);
check('the member opens the item', memberItem.status === 200, String(memberItem.status));

const strangerItem = await get(`/biblioteca/${SLUG}`, strangerCookie);
check('someone without the right gets 404', strangerItem.status === 404, String(strangerItem.status));

const invented = await get('/biblioteca/nao-existe-isso', memberCookie);
check('a made-up slug gets the same 404', invented.status === 404, String(invented.status));

// 4. The download route — the criterion the plan actually named.
const memberDownload = await get(`/api/biblioteca/${SLUG}/download`, memberCookie);
const signedUrl = memberDownload.headers.get('location') ?? '';
check(
  'the member is redirected to a signed URL',
  memberDownload.status === 307 && signedUrl.includes('token='),
  String(memberDownload.status),
);

const strangerDownload = await get(`/api/biblioteca/${SLUG}/download`, strangerCookie);
check(
  'someone without the right gets 404 on the download',
  strangerDownload.status === 404,
  String(strangerDownload.status),
);

const anonDownload = await get(`/api/biblioteca/${SLUG}/download`, null);
check('signed out gets 404 too, not a redirect to the door', anonDownload.status === 404);

// 5. The signed URL has to actually work, or the 307 is theatre.
if (signedUrl) {
  const file = await fetch(signedUrl);
  check(
    'the signed URL really serves the PDF',
    file.status === 200 && file.headers.get('content-type')?.includes('pdf'),
    `${file.status} ${file.headers.get('content-type')}`,
  );
}

// 6. The bucket itself is closed. Without this the signed URL is pointless:
//    anyone could read the object directly with the public key.
const anonStorage = await fetch(`${SUPA}/storage/v1/object/library/${STORAGE_PATH}`, {
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
});
check(
  'the public key cannot read the object directly',
  anonStorage.status === 400 || anonStorage.status === 403 || anonStorage.status === 404,
  String(anonStorage.status),
);

const memberStorage = await fetch(`${SUPA}/storage/v1/object/library/${STORAGE_PATH}`, {
  headers: { apikey: ANON, Authorization: `Bearer ${(await signIn(member.email)).access_token}` },
});
check(
  'a signed-in member cannot read the object directly either',
  memberStorage.status === 400 || memberStorage.status === 403 || memberStorage.status === 404,
  String(memberStorage.status),
);

// 7. The download was recorded, and by the only thing allowed to record it.
const { data: events } = await admin
  .from('download_events')
  .select('user_id, content_item_id')
  .eq('user_id', member.id);
check('the download left an event', (events ?? []).length === 1, String((events ?? []).length));

const memberDb = createServerClient(SUPA, ANON, {
  cookies: { getAll: () => [], setAll: () => {} },
});
await memberDb.auth.signInWithPassword({ email: member.email, password });
const { error: forgeError } = await memberDb.from('download_events').insert({
  user_id: member.id,
  content_item_id: events?.[0]?.content_item_id,
});
check('a member cannot write their own download history', forgeError !== null,
  forgeError?.code ?? 'sem erro!');

async function signIn(email) {
  const client = createClient(SUPA, ANON, { auth: { persistSession: false } });
  const { data } = await client.auth.signInWithPassword({ email, password });
  return data.session;
}

await admin.from('entitlements').delete().eq('user_id', member.id);
await admin.auth.admin.deleteUser(member.id);
await admin.auth.admin.deleteUser(stranger.id);

let failed = 0;
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
