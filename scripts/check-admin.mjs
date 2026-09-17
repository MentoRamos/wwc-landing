/**
 * Acceptance check for the admin screen, against a real server and a real
 * Postgres.
 *
 * The RLS suite already proves the database refuses the wrong person. This
 * proves the other half: that the *route* refuses them too, and that it
 * refuses by disappearing rather than by redirecting, so `/admin/acessos`
 * never confirms itself to a stranger.
 *
 * Wants a built server running against the local stack and the local keys in
 * ANON_KEY / SERVICE_ROLE_KEY:
 *
 *   eval "$(supabase status -o env | sed 's/^/export /')"
 *   APP_URL=http://127.0.0.1:3001 node scripts/check-admin.mjs
 */
import { createHmac } from 'node:crypto';
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

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const admin = createClient(SUPA, SERVICE, { auth: { persistSession: false } });
const password = 'senha-de-teste-forte-123';

async function makeUser(label, { isAdmin }) {
  const email = `admin-check.${label}.${Date.now()}@teste.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Pessoa ${label}` },
  });
  if (error) throw error;

  if (isAdmin) {
    const { error: promoteError } = await admin
      .from('admin_users')
      .insert({ user_id: data.user.id });
    if (promoteError) throw promoteError;
  }
  return { email, id: data.user.id };
}

/** The cookies a browser would be holding after signing in. */
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

const member = await makeUser('membro', { isAdmin: false });
const boss = await makeUser('admin', { isAdmin: true });

const memberCookie = await cookiesFor(member.email);
const bossCookie = await cookiesFor(boss.email);

// 1. Signed out, the admin door does not even admit to being a door.
const anonymous = await fetch(`${APP}/admin/acessos`, { redirect: 'manual' });
check(
  'signed out, /admin/acessos sends you to the door',
  anonymous.status === 307,
  `${anonymous.status} -> ${anonymous.headers.get('location')}`,
);

// 2. A signed-in member gets a 404, not a redirect: a redirect would confirm
//    the route is real and worth coming back to.
const asMember = await fetch(`${APP}/admin/acessos`, {
  headers: { cookie: memberCookie },
  redirect: 'manual',
});
check('a member gets 404, not a redirect', asMember.status === 404, String(asMember.status));

// 3. The admin gets the screen.
const asAdmin = await fetch(`${APP}/admin/acessos`, {
  headers: { cookie: bossCookie },
  redirect: 'manual',
});
const adminHtml = await asAdmin.text();
check('an admin gets the screen', asAdmin.status === 200, String(asAdmin.status));
check('the screen carries the grant form', adminHtml.includes('Conceder acesso'));

// 4. The grant itself, through the policy rather than around it.
const target = `concedido.${Date.now()}@teste.local`;
const memberClient = createServerClient(SUPA, ANON, {
  cookies: { getAll: () => [], setAll: () => {} },
});
await memberClient.auth.signInWithPassword({ email: member.email, password });
const { error: memberWrite } = await memberClient.from('entitlements').insert({
  email_norm: target,
  email_raw: target,
  product: 'circle',
  source: 'manual',
});
check('a member cannot grant access', memberWrite !== null, memberWrite?.code ?? 'sem erro!');

const bossClient = createServerClient(SUPA, ANON, {
  cookies: { getAll: () => [], setAll: () => {} },
});
await bossClient.auth.signInWithPassword({ email: boss.email, password });
const { error: bossWrite } = await bossClient.from('entitlements').insert({
  email_norm: target,
  email_raw: target,
  product: 'circle',
  source: 'manual',
  granted_by: boss.id,
});
check('an admin can grant access', bossWrite === null, bossWrite?.message ?? '');

// 5. And the grant left a trail, without anyone asking it to.
const { data: trail } = await admin
  .from('admin_audit')
  .select('action, payload')
  .eq('target_email', target);
check(
  'the grant wrote an audit row by itself',
  trail?.length === 1 && trail[0].action === 'entitlement.insert',
  JSON.stringify(trail ?? []),
);

// 6. The admin sees the row on the screen; the member still cannot reach it.
const listed = await fetch(`${APP}/admin/acessos`, {
  headers: { cookie: bossCookie },
  redirect: 'manual',
});
check('the new grant shows up on the screen', (await listed.text()).includes(target));

// 7. A sonda do webhook: a tela que explica um 400 mudo.
//
//    A linha é plantada com um corpo assinado por um algoritmo CONHECIDO, e o
//    teste exige que a tela aponte esse algoritmo pelo nome. Sem isso, a
//    página passaria verde mostrando a sonda e errando a conta, que é a única
//    coisa que ela existe para fazer.
const probeMark = `sonda-${Date.now()}`;
const probeBody = JSON.stringify({ order_id: probeMark, teste: true });
const probeSignature = createHmac('sha256', process.env.KIWIFY_WEBHOOK_TOKEN ?? 'segredo-local')
  .update(probeBody)
  .digest('hex');

const { data: probe, error: probeError } = await admin
  .from('webhook_probes')
  .insert({
    provider: 'kiwify',
    reason: 'assinatura não reconhecida',
    sources: ['query:signature'],
    signature_seen: probeSignature,
    body: probeBody,
    body_bytes: probeBody.length,
  })
  .select('id')
  .single();
check('the probe row was planted', probeError === null, probeError?.message ?? '');

const probesAsMember = await fetch(`${APP}/admin/sondas`, {
  headers: { cookie: memberCookie },
  redirect: 'manual',
});
check('a member gets 404 on /admin/sondas', probesAsMember.status === 404, String(probesAsMember.status));

const probesAsAdmin = await fetch(`${APP}/admin/sondas`, {
  headers: { cookie: bossCookie },
  redirect: 'manual',
});
const probesHtml = await probesAsAdmin.text();
check('an admin gets the probe screen', probesAsAdmin.status === 200, String(probesAsAdmin.status));
// Procura a marca, não o JSON cru: React escapa as aspas para `&quot;`, e
// comparar o corpo inteiro reprovaria uma tela correta.
check('the screen shows the probe body', probesHtml.includes(probeMark));
check('the screen names where the signature came from', probesHtml.includes('query:signature'));
// Exige o veredito, não o rótulo: a lista de formas aparece em toda sonda, e
// só o "bate com" prova que a conta foi feita e deu certo.
check(
  'the screen works out which form matches',
  probesHtml.includes('Bate com hmac-sha256'),
);

// The discard goes through the policy: a member must not be able to erase the
// evidence, an admin must be able to pay off the privacy debt.
const { error: memberDiscard } = await memberClient
  .from('webhook_probes')
  .delete()
  .eq('id', probe?.id ?? '00000000-0000-0000-0000-000000000000');
const { data: survived } = await admin
  .from('webhook_probes')
  .select('id')
  .eq('id', probe?.id ?? '');
check(
  'a member cannot discard a probe',
  (survived?.length ?? 0) === 1,
  memberDiscard?.code ?? 'sem erro, e a linha sobreviveu',
);

const { error: bossDiscard } = await bossClient
  .from('webhook_probes')
  .delete()
  .eq('id', probe?.id ?? '');
const { data: gone } = await admin.from('webhook_probes').select('id').eq('id', probe?.id ?? '');
check(
  'an admin can discard a probe',
  bossDiscard === null && (gone?.length ?? 1) === 0,
  bossDiscard?.message ?? '',
);

await admin.from('webhook_probes').delete().eq('id', probe?.id ?? '');
await admin.from('entitlements').delete().eq('email_norm', target);
await admin.auth.admin.deleteUser(member.id);
await admin.auth.admin.deleteUser(boss.id);

let failed = 0;
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
