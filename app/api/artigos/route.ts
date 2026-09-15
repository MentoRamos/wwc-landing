import { adminClient } from '@/lib/supabase/admin';
import { cronAuthorized } from '@/lib/cron-auth';
import { articlePath, parseArticleInput } from '@/lib/core/articles.core';
import { resolveSiteUrl } from '@/lib/core/site.core';
import { pickCover } from '@/lib/core/covers.core';
import { COVERS } from '@/lib/articles/covers';

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

  const admin = adminClient();

  // A capa entra quando o artigo ainda não tem uma: na criação, e nos artigos
  // que nasceram antes das capas. Reenvio de artigo que já tem capa não troca
  // a imagem, nem a que o admin escolheu à mão.
  const { data: existing } = await admin
    .from('articles')
    .select('cover_key')
    .eq('slug', parsed.value.slug)
    .maybeSingle();

  let row: typeof parsed.value & { cover_key?: string } = parsed.value;
  if (!existing?.cover_key) {
    const { data: used } = await admin.from('articles').select('cover_key').not('cover_key', 'is', null);
    const usage: Record<string, number> = {};
    for (const { cover_key } of used ?? []) usage[cover_key] = (usage[cover_key] ?? 0) + 1;
    const cover = pickCover(parsed.value.topic, usage, parsed.value.slug, COVERS);
    if (cover) row = { ...row, cover_key: cover };
  }

  const { data, error } = await admin
    .from('articles')
    .upsert(row, { onConflict: 'slug' })
    .select('slug, created_at, updated_at, hidden_at, cover_key')
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
      cover: data.cover_key,
    },
    { status: created ? 201 : 200 },
  );
}
