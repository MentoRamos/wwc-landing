/**
 * Aceite dos artigos do Circle: servidor construído, Postgres de verdade, e o
 * mesmo POST que o cron do servidor faz todo dia.
 *
 * O que só dá para provar assim, e não em teste de unidade: que a página sai
 * com 404 de verdade quando o artigo some, que o reenvio do cron não
 * republica o que o admin escondeu, que o sitemap enxerga o artigo de hoje e
 * que um link `javascript:` escrito pelo modelo não vira link na página.
 *
 * O servidor precisa rodar com ARTICLES_INGEST_TOKEN=<segredo>.
 */
import { createClient } from '@supabase/supabase-js';

const APP = process.env.APP_URL ?? 'http://127.0.0.1:3011';
const SUPA = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE = process.env.SERVICE_ROLE_KEY;
const TOKEN = process.env.ARTICLES_INGEST_TOKEN;

if (!SERVICE || !TOKEN) {
  console.error('Faltam SERVICE_ROLE_KEY e ARTICLES_INGEST_TOKEN no ambiente.');
  process.exit(2);
}

const admin = createClient(SUPA, SERVICE, { auth: { persistSession: false } });
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const stamp = Date.now();
const slug = `aceite-artigo-${stamp}`;
const paragraph =
  'Num estudo com 4.098 pessoas medidas em casa, a recuperação nas três primeiras horas de sono caiu de forma clara. ';

function article(over = {}) {
  return {
    slug,
    title: `Artigo de aceite ${stamp}`,
    dek: 'Uma linha fina que diz a conclusão do artigo em uma frase.',
    body_md:
      `${paragraph.repeat(8)}\n\n## O que os dados dizem\n\n${paragraph.repeat(8)}\n\n` +
      '- item um\n- item dois\n\n[link malicioso](javascript:alert(1)) e [link bom](https://doi.org/10.1000/ok)',
    sources: [{ label: `Fonte de aceite ${stamp}. Revista, 2025.`, url: 'https://doi.org/10.1000/aceite' }],
    topic: 'sono',
    source_kit: `2026-09-15-aceite-${stamp}`,
    ...over,
  };
}

async function post(body, auth = `Bearer ${TOKEN}`) {
  const response = await fetch(`${APP}/api/artigos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {}
  return { status: response.status, json };
}

async function get(path) {
  const response = await fetch(`${APP}${path}`, { redirect: 'manual' });
  return { status: response.status, type: response.headers.get('content-type') ?? '', text: await response.text() };
}

try {
  // Portão
  check('sem token: 401', (await post(article(), null)).status === 401);
  check('token errado: 401', (await post(article(), 'Bearer errado')).status === 401);

  // Validação
  check('JSON quebrado: 400', (await post('{nao é json')).status === 400);
  const dash = await post(article({ title: `Com travessão ${String.fromCharCode(0x2014)} no meio` }));
  check('travessão no título: 400 com motivo legível', dash.status === 400 && /travessão/.test(dash.json?.error ?? ''), JSON.stringify(dash.json));
  const html = await post(article({ body_md: `${paragraph.repeat(20)}<script>alert(1)</script>` }));
  check('HTML cru no corpo: 400', html.status === 400, JSON.stringify(html.json));

  // Publicar
  const first = await post(article());
  check('publicar: 201 e created', first.status === 201 && first.json?.created === true, JSON.stringify(first.json));
  check('publicar: devolve a URL do artigo', first.json?.url?.endsWith(`/circle/artigos/${slug}`), first.json?.url);

  const page = await get(`/circle/artigos/${slug}`);
  check('página: 200', page.status === 200, String(page.status));
  check('página: traz o título', page.text.includes(`Artigo de aceite ${stamp}`));
  check('página: traz o aviso médico fixo', page.text.includes('não substitui avaliação médica'));
  check('página: traz a fonte', page.text.includes(`Fonte de aceite ${stamp}`));
  check('página: traz o convite pro Circle', page.text.includes('Conhecer o Circle'));
  check('página: JSON-LD de Article', page.text.includes('"@type":"Article"'));
  check('página: link javascript: não vira link', !/href="javascript:/i.test(page.text));
  check('página: link https vira link', page.text.includes('href="https://doi.org/10.1000/ok"'));

  const index = await get('/circle/artigos');
  check('índice: lista o artigo', index.status === 200 && index.text.includes(`Artigo de aceite ${stamp}`));

  const circle = await get('/circle');
  check('/circle: bloco dos últimos artigos', circle.status === 200 && circle.text.includes(`Artigo de aceite ${stamp}`));

  const sitemap = await get('/circle/artigos/sitemap.xml');
  check('sitemap: lista o artigo de hoje', sitemap.status === 200 && sitemap.text.includes(`/circle/artigos/${slug}`));

  const og = await fetch(`${APP}${page.text.match(/property="og:image" content="https?:\/\/[^/]+([^"?]+)/)?.[1] ?? '/nada'}`);
  check('imagem de compartilhamento: PNG', og.status === 200 && (og.headers.get('content-type') ?? '').includes('image/png'), `${og.status} ${og.headers.get('content-type')}`);

  // Reenvio
  const { data: before } = await admin.from('articles').select('published_at').eq('slug', slug).single();
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const again = await post(article({ title: `Artigo de aceite ${stamp} corrigido` }));
  check('reenvio: 200 e não created', again.status === 200 && again.json?.created === false, JSON.stringify(again.json));
  const { data: rows } = await admin.from('articles').select('id, title').eq('slug', slug);
  check('reenvio: continua uma linha só, com o texto novo', rows?.length === 1 && rows[0].title.endsWith('corrigido'));
  const { data: kept } = await admin.from('articles').select('published_at').eq('slug', slug).single();
  check('reenvio sem data: a data original fica', kept?.published_at === before?.published_at, `${before?.published_at} -> ${kept?.published_at}`);
  const naive = await post(article({ published_at: '2026-09-14T10:00:00' }));
  check('data sem fuso: 400', naive.status === 400, JSON.stringify(naive.json));

  // Esconder (o que o admin faz) e o cron reenviando por cima
  await admin.from('articles').update({ hidden_at: new Date().toISOString() }).eq('slug', slug);
  check('escondido: página 404', (await get(`/circle/artigos/${slug}`)).status === 404);
  check('escondido: some do índice', !(await get('/circle/artigos')).text.includes(`Artigo de aceite ${stamp}`));

  const resend = await post(article());
  const { data: after } = await admin.from('articles').select('hidden_at').eq('slug', slug).single();
  check('reenvio do cron não republica o escondido', resend.json?.hidden === true && after?.hidden_at !== null, JSON.stringify(resend.json));
  check('reenvio do cron: página continua 404', (await get(`/circle/artigos/${slug}`)).status === 404);

  // 404 honesto
  check('slug inexistente: 404', (await get('/circle/artigos/nao-existe-mesmo')).status === 404);
  check('slug malformado: 404', (await get('/circle/artigos/Nao_Pode')).status === 404);
} finally {
  await admin.from('articles').delete().eq('slug', slug);
}

let failed = 0;
for (const { name, ok, detail } of results) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${name}${!ok && detail ? `  (${detail})` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length}`);
process.exit(failed ? 1 : 0);
