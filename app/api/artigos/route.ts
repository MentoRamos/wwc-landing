import { adminClient } from '@/lib/supabase/admin';
import { cronAuthorized } from '@/lib/cron-auth';
import { articlePath, parseArticleInput } from '@/lib/core/articles.core';
import { resolveSiteUrl } from '@/lib/core/site.core';

/**
 * Onde o cron do servidor publica o artigo do dia.
 *
 * O token (`ARTICLES_INGEST_TOKEN`) só serve para isto. Se ele vazar, o pior
 * que acontece é alguém publicar um artigo, e o Kauã esconde com um clique.
 * Por isso a escrita usa service role aqui e em nenhum outro lugar do
 * servidor da OpenClaw: a chave que abre o banco inteiro (e os documentos de
 * aluno) nunca sai da Vercel.
 *
 * Reenviar o mesmo slug atualiza o texto e não duplica. O upsert não inclui
 * `hidden_at`, então um artigo escondido continua escondido depois do reenvio.
 */
export const dynamic = 'force-dynamic';

// Um artigo de 1.200 palavras com 30 fontes fica bem abaixo disto. Um corpo
// maior é engano ou abuso, e parsear JSON gigante antes de recusar é o
// trabalho que um abuso quer que a gente faça.
const MAX_BYTES = 256 * 1024;

export async function POST(request: Request) {
  if (!cronAuthorized(request.headers.get('authorization'), process.env.ARTICLES_INGEST_TOKEN)) {
    return Response.json({ ok: false, error: 'não autorizado' }, { status: 401 });
  }

  // O cabeçalho recusa antes de ler; o corpo é medido em bytes depois, porque
  // o cabeçalho pode faltar ou mentir.
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) {
    return Response.json({ ok: false, error: 'corpo grande demais' }, { status: 413 });
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) {
    return Response.json({ ok: false, error: 'corpo grande demais' }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: 'o corpo não é JSON válido' }, { status: 400 });
  }

  const parsed = parseArticleInput(payload, new Date());
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.message }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from('articles')
    .upsert(parsed.value, { onConflict: 'slug' })
    .select('slug, created_at, updated_at, hidden_at')
    .single();

  if (error || !data) {
    // Só o código: a mensagem do Postgres pode ecoar o conteúdo da linha.
    console.error('[api/artigos] upsert falhou', { code: error?.code });
    return Response.json({ ok: false, error: 'não consegui gravar' }, { status: 502 });
  }

  const site = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });

  // Na inserção as duas colunas nascem do mesmo `now()` da transação; no
  // update o gatilho move `updated_at`.
  const created = data.created_at === data.updated_at;

  console.log('[api/artigos] gravado', { slug: data.slug, created });
  return Response.json(
    {
      ok: true,
      slug: data.slug,
      url: `${site}${articlePath(data.slug)}`,
      created,
      hidden: data.hidden_at !== null,
    },
    { status: created ? 201 : 200 },
  );
}
