/**
 * The acceptance check for sign-in: does a real session actually open the
 * platform, and does its absence actually close it.
 *
 * Google is only the identity provider — everything after the redirect is
 * ours, and that is the part that can break. So this mints a real Supabase
 * session with a password, takes the very cookies a browser would hold, and
 * drives the running server with them. No mock anywhere: real Postgres, real
 * auth server, real Next build.
 *
 * Needs the local stack and a built server:
 *
 *   npx supabase start
 *   npm run build && npx next start &
 *   eval "$(npx supabase status -o env | grep -E '^(ANON|SERVICE_ROLE)_KEY=')" \\
 *     ANON_KEY="$ANON_KEY" SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" npm run check:auth
 *
 * Verified by mutation: replacing `requireUser()` with `currentUser()` in the
 * app layout fails exactly the two anonymous-visitor assertions.
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const APP = process.env.APP_URL ?? 'http://127.0.0.1:3000';
const SUPA = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.ANON_KEY;
const SERVICE = process.env.SERVICE_ROLE_KEY;

if (!ANON || !SERVICE) {
  console.error('Set ANON_KEY and SERVICE_ROLE_KEY (npx supabase status -o env).');
  process.exit(2);
}

const email = `fase2.${Date.now()}@teste.local`;
const password = 'senha-de-teste-forte-123';
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const admin = createClient(SUPA, SERVICE, { auth: { persistSession: false } });

// 1. Someone the platform has never seen.
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Pessoa De Teste' },
});
if (createError) throw createError;
const userId = created.user.id;

// The trigger should have written a profile and nothing else.
const { data: profile } = await admin.from('profiles').select('email, full_name').eq('id', userId).single();
check('signing up writes a profile', profile?.email === email, JSON.stringify(profile));

// 2. Kauã grants the Circle by hand, the way Fase 3 will.
const { error: grantError } = await admin.from('entitlements').insert({
  email_norm: email,
  email_raw: email,
  product: 'circle',
  source: 'manual',
  user_id: userId,
  expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
});
if (grantError) throw grantError;

// 3. Sign in the way the browser does, and keep the cookies it would keep.
const jar = new Map();
const supabase = createServerClient(SUPA, ANON, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (toSet) => toSet.forEach(({ name, value }) => jar.set(name, value)),
  },
});
const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) throw signInError;
const cookieHeader = [...jar.entries()].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ');
check('signing in produces session cookies', jar.size > 0, `${jar.size} cookie(s)`);

// 4. Signed out, the door is locked.
const anonymous = await fetch(`${APP}/inicio`, { redirect: 'manual' });
check(
  'signed out, /inicio sends you to the door',
  anonymous.status === 307 && anonymous.headers.get('location') === '/entrar',
  `${anonymous.status} -> ${anonymous.headers.get('location')}`,
);

// 5. Signed in, the page renders and shows what this person actually has.
const signedIn = await fetch(`${APP}/inicio`, {
  headers: { cookie: cookieHeader },
  redirect: 'manual',
});
const html = await signedIn.text();
check('signed in, /inicio renders', signedIn.status === 200, String(signedIn.status));
check('the page knows who it is talking to', html.includes(email));
check('greets them by name from the profiles row', /<h1[^>]*>Olá,\s*(<!--[^>]*-->)?\s*Pessoa\b/.test(html));
check('shows the Circle they were granted', html.includes('W&amp;W Circle'));
check('does not show a product they never bought', !html.includes('W&amp;W Protocol'));

// 6. The sign-in page bounces someone who is already in.
const already = await fetch(`${APP}/entrar`, { headers: { cookie: cookieHeader }, redirect: 'manual' });
check(
  'already signed in, /entrar sends you on',
  already.status === 307 && already.headers.get('location') === '/inicio',
  `${already.status} -> ${already.headers.get('location')}`,
);

// 7. Signing out clears the cookie, not just the page.
const out = await fetch(`${APP}/api/auth/sair`, {
  method: 'POST',
  headers: { cookie: cookieHeader },
  redirect: 'manual',
});
const cleared = (out.headers.getSetCookie?.() ?? []).some((c) => /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c));
check('signing out expires the cookie', out.status === 303 && cleared, `${out.status}, cleared=${cleared}`);

// 8. And the old cookie really is dead at the server.
const afterOut = await fetch(`${APP}/inicio`, { headers: { cookie: cookieHeader }, redirect: 'manual' });
check(
  'the old cookie no longer opens anything',
  afterOut.status === 307,
  `${afterOut.status} -> ${afterOut.headers.get('location')}`,
);

// 9. A subscription past its date drops off the page. Showing someone their
// own lapsed row would be harmless; what the policy guards is the content
// behind it, which `active_products()` checks by date inside the query.
await admin
  .from('entitlements')
  .update({ expires_at: new Date(Date.now() - 864e5).toISOString() })
  .eq('user_id', userId);
const jar2 = new Map();
const supabase2 = createServerClient(SUPA, ANON, {
  cookies: {
    getAll: () => [...jar2.entries()].map(([name, value]) => ({ name, value })),
    setAll: (toSet) => toSet.forEach(({ name, value }) => jar2.set(name, value)),
  },
});
await supabase2.auth.signInWithPassword({ email, password });
const cookie2 = [...jar2.entries()].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ');
const expired = await fetch(`${APP}/inicio`, { headers: { cookie: cookie2 }, redirect: 'manual' });
const expiredHtml = await expired.text();
check(
  'an expired subscription shows nothing',
  expired.status === 200 && !expiredHtml.includes('W&amp;W Circle'),
  String(expired.status),
);

/**
 * 10. /conta shows a person their own data and nobody else's.
 *
 * The page reads `entitlements` with no `where user_id = ...` anywhere in it,
 * because RLS is the filter. That is the design — but it means a loosened
 * policy would leak one member's purchases onto another's account page with
 * no error and no sign, so it is asserted with two real accounts.
 */
const otherEmail = `fase2.outra.${Date.now()}@teste.local`;
const { data: other } = await admin.auth.admin.createUser({
  email: otherEmail,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Outra Pessoa' },
});
await admin.from('entitlements').insert({
  email_norm: otherEmail,
  email_raw: otherEmail,
  product: 'protocol',
  source: 'manual',
  user_id: other.user.id,
});

const jar3 = new Map();
const supabase3 = createServerClient(SUPA, ANON, {
  cookies: {
    getAll: () => [...jar3.entries()].map(([name, value]) => ({ name, value })),
    setAll: (toSet) => toSet.forEach(({ name, value }) => jar3.set(name, value)),
  },
});
await supabase3.auth.signInWithPassword({ email, password });
const cookie3 = [...jar3.entries()].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ');

const conta = await fetch(`${APP}/conta`, { headers: { cookie: cookie3 }, redirect: 'manual' });
const contaHtml = await conta.text();
check('/conta opens for a signed-in member', conta.status === 200, String(conta.status));
check('it shows their own address', contaHtml.includes(email));
check('it does not show another member address', !contaHtml.includes(otherEmail));
check('it does not show another member product', !contaHtml.includes('W&amp;W Protocol'));

const contaOut = await fetch(`${APP}/conta`, { redirect: 'manual' });
check('signed out, /conta sends you to the door', contaOut.status === 307, String(contaOut.status));

await admin.from('entitlements').delete().eq('user_id', other.user.id);
await admin.auth.admin.deleteUser(other.user.id);

await admin.auth.admin.deleteUser(userId);

let failed = 0;
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
