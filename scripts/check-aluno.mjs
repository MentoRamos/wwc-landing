/**
 * O teste de aceite da área do aluno: o documento de uma pessoa chega a ela,
 * não chega a mais ninguém, e toda leitura deixa rastro.
 *
 * Nada mockado. Postgres de verdade, storage de verdade, build de verdade, e
 * duas contas com senha real dirigindo o servidor como um navegador dirigiria.
 * O critério de aceite da Fase 9 é "aluno A não enxerga nada do aluno B", e a
 * suíte de RLS já prova isso na camada de dados — este script prova na
 * camada que a pessoa usa, que é onde um `select` mal escrito apareceria.
 *
 * Precisa do stack local e de um servidor buildado:
 *
 *   npx supabase start
 *   npm run build && npx next start &
 *   eval "$(npx supabase status -o env | grep -E '^(ANON|SERVICE_ROLE)_KEY=')" \
 *     ANON_KEY="$ANON_KEY" SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" npm run check:aluno
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const APP = process.env.APP_URL ?? 'http://127.0.0.1:3000';
const SUPA = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
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

// Um PDF mínimo, mas PDF de verdade: o bucket recusa qualquer outro tipo, e um
// arquivo falso faria o upload passar e o download servir lixo.
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 99 99]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n%%EOF\n',
  'utf8',
);

async function makeUser(label) {
  const email = `aluno-check.${label}.${Date.now()}@teste.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Pessoa ${label}` },
  });
  if (error) throw error;
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

const get = (path, cookie) =>
  fetch(`${APP}${path}`, { headers: cookie ? { cookie } : {}, redirect: 'manual' });

const owner = await makeUser('dono');
const other = await makeUser('outro');
const ownerCookie = await cookiesFor(owner.email);
const otherCookie = await cookiesFor(other.email);

// O documento: arquivo no bucket privado, linha na tabela, exatamente como a
// tela de admin faz — arquivo primeiro, linha depois.
const STORAGE_PATH = `weekly_report/2026-09-14/check-${Date.now()}.pdf`;
const TITLE = 'Weekly Report da checagem';

const { error: uploadError } = await admin.storage
  .from('students')
  .upload(STORAGE_PATH, PDF, { contentType: 'application/pdf', upsert: true });
if (uploadError) throw uploadError;

const { data: docRow, error: insertError } = await admin
  .from('student_documents')
  .insert({
    email_norm: owner.email,
    email_raw: owner.email,
    user_id: owner.id,
    kind: 'weekly_report',
    title: TITLE,
    period_label: 'Semana 3 (08-14 set)',
    issued_at: '2026-09-14',
    storage_path: STORAGE_PATH,
  })
  .select('id')
  .single();
if (insertError) throw insertError;
const docId = docRow.id;

// 1. A página do dono mostra o documento, e não mostra o caminho do arquivo.
const ownerPage = await get('/aluno', ownerCookie);
const ownerHtml = await ownerPage.text();
check('o dono abre a área', ownerPage.status === 200, String(ownerPage.status));
check('e vê o documento dele', ownerHtml.includes(TITLE));
check(
  'a página nunca carrega o caminho do arquivo',
  !ownerHtml.includes(STORAGE_PATH) && !ownerHtml.includes('.pdf'),
);

// 2. A outra pessoa abre a mesma página e não há nada dela ali.
const otherPage = await get('/aluno', otherCookie);
const otherHtml = await otherPage.text();
check('outro membro também abre a área', otherPage.status === 200, String(otherPage.status));
check('mas não vê o documento alheio', !otherHtml.includes(TITLE));
check('nem o id dele', !otherHtml.includes(docId));

// 3. O download. O critério de aceite da fase, no caminho que entrega o arquivo.
const otherDownload = await get(`/api/aluno/${docId}/download`, otherCookie);
check(
  'outro membro leva 404 no download, não 403',
  otherDownload.status === 404,
  String(otherDownload.status),
);

const anonDownload = await get(`/api/aluno/${docId}/download`, null);
check(
  'deslogado leva 404 também, não a porta de login',
  anonDownload.status === 404,
  String(anonDownload.status),
);

const madeUp = await get('/api/aluno/00000000-0000-0000-0000-000000000000/download', ownerCookie);
check('um id inventado leva o mesmo 404', madeUp.status === 404, String(madeUp.status));

const ownerDownload = await get(`/api/aluno/${docId}/download`, ownerCookie);
const signedUrl = ownerDownload.headers.get('location') ?? '';
check(
  'o dono é redirecionado para uma URL assinada',
  ownerDownload.status === 307 && signedUrl.includes('/object/sign/students/'),
  `${ownerDownload.status}`,
);

if (signedUrl) {
  const served = await fetch(signedUrl.startsWith('http') ? signedUrl : `${SUPA}${signedUrl}`);
  check(
    'e a URL assinada serve mesmo o PDF',
    served.status === 200 && (served.headers.get('content-type') ?? '').includes('pdf'),
    `${served.status} ${served.headers.get('content-type')}`,
  );
}

// 4. A trilha. É o que diferencia esta rota da rota da Library.
const { data: trail } = await admin
  .from('document_access_log')
  .select('actor_id, actor_role, action')
  .eq('document_id', docId);

check('a leitura do dono virou uma linha na trilha', (trail ?? []).length === 1, String((trail ?? []).length));
check(
  'e a linha diz que foi o próprio dono',
  trail?.[0]?.actor_role === 'own' && trail?.[0]?.actor_id === owner.id,
  trail?.[0]?.actor_role ?? 'sem linha',
);
check(
  'a recusa do outro membro não virou linha',
  (trail ?? []).length === 1,
  'uma tentativa negada não é um acesso',
);

// 5. O bucket não se abre por fora.
const anonStorage = createClient(SUPA, ANON, { auth: { persistSession: false } });
const { error: anonRead } = await anonStorage.storage.from('students').download(STORAGE_PATH);
check('a chave pública não lê o objeto direto', anonRead !== null, anonRead?.message ?? 'leu!');

// 6. O membro não escreve a própria história.
const memberClient = createClient(SUPA, ANON, { auth: { persistSession: false } });
await memberClient.auth.signInWithPassword({ email: owner.email, password });
const { error: forge } = await memberClient
  .from('document_access_log')
  .insert({ document_id: docId, actor_role: 'own', action: 'forjado' });
check('nem o dono escreve na própria trilha', forge !== null, forge?.code ?? 'sem erro!');

await admin.from('student_documents').delete().eq('id', docId);
await admin.storage.from('students').remove([STORAGE_PATH]);
await admin.auth.admin.deleteUser(owner.id);
await admin.auth.admin.deleteUser(other.id);

let failed = 0;
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
