import { adminClient } from '@/lib/supabase/admin';
import { publicSupabaseEnv } from '@/lib/supabase/env';
import { cronAuthorized } from '@/lib/cron-auth';
import { podcastRefs } from '@/lib/core/podcast.core';
import {
  AUDIO_BUCKET,
  AUDIO_MAX_BYTES,
  AUDIO_MIN_BYTES,
  audioMimeType,
  audioObjectPath,
  audioPublicUrl,
  audioSeconds,
  publishableAudio,
} from '@/lib/core/audio.core';

/**
 * O caminho do áudio GRANDE: em vez de atravessar esta função, o arquivo vai
 * direto do servidor para o bucket, com uma URL de upload assinada.
 *
 * Por que isto existe: o `POST /api/artigos/<slug>/audio` recebe o arquivo no
 * corpo do pedido, e corpo de request na Vercel para perto de 4,5 MB. Medido:
 * um episódio de 13 minutos devolvia 413 ali, mesmo com o nosso limite em
 * 25 MiB e o bucket aceitando. Isso prendia o MP3 do podcast em ~48 kbps, que
 * é audível mas feio. Assinando o upload, o teto que vale passa a ser o do
 * bucket, e o episódio sai em 64 kbps ou mais.
 *
 * Nenhum poder novo entra no servidor da OpenClaw: o token assinado vale para
 * UM caminho de objeto, derivado do slug e da impressão digital do conteúdo, e
 * por alguns minutos. A chave de service role continua só na Vercel.
 *
 * São dois passos de propósito:
 *
 *     POST  .../audio/direto   { extension, fingerprint, bytes }  -> onde subir
 *     (o servidor sobe o arquivo direto no bucket)
 *     PUT   .../audio/direto   { path, seconds }                  -> publica
 *
 * O PUT só aponta o artigo para o objeto DEPOIS de baixar o primeiro quilobyte
 * dele. Upload assinado que falhou no meio deixa objeto truncado, e um
 * `<audio>` apontando para arquivo truncado é pior que um botão que não
 * aparece.
 */
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FINGERPRINT = /^[a-f0-9]{8,64}$/i;
const EXTENSIONS = new Set(['ogg', 'mp3']);

function unauthorized(request: Request): boolean {
  return !cronAuthorized(
    request.headers.get('authorization'),
    process.env.ARTICLES_INGEST_TOKEN,
  );
}

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request, { params }: Params) {
  if (unauthorized(request)) {
    return Response.json({ ok: false, error: 'não autorizado' }, { status: 401 });
  }

  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 90) {
    return Response.json({ ok: false, error: 'slug inválido' }, { status: 400 });
  }

  const payload = await body(request);
  const extension = String(payload.extension ?? '').toLowerCase();
  const fingerprint = String(payload.fingerprint ?? '');
  const bytes = Number(payload.bytes ?? 0);

  if (!EXTENSIONS.has(extension)) {
    return Response.json({ ok: false, error: 'extension precisa ser ogg ou mp3' }, { status: 400 });
  }
  if (!publishableAudio(extension)) {
    // Ogg toca no site, mas tira o episódio do Spotify. Ver publishableAudio.
    return Response.json({ ok: false, error: 'só mp3: ogg tira o episódio do feed do Spotify' }, { status: 415 });
  }
  if (!FINGERPRINT.test(fingerprint)) {
    return Response.json({ ok: false, error: 'fingerprint precisa ser sha256 em hex' }, { status: 400 });
  }
  if (!Number.isFinite(bytes) || bytes < AUDIO_MIN_BYTES || bytes > AUDIO_MAX_BYTES) {
    return Response.json(
      { ok: false, error: `bytes precisa estar entre ${AUDIO_MIN_BYTES} e ${AUDIO_MAX_BYTES}` },
      { status: 413 },
    );
  }

  const admin = adminClient();

  // Mesmo motivo do endpoint antigo: slug errado deixaria um objeto órfão de
  // vários MB no bucket, pago e sem nenhuma linha apontando para ele.
  const { data: article, error: lookup } = await admin
    .from('articles')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();

  if (lookup) {
    console.error('[api/artigos/audio/direto] leitura falhou', { code: lookup.code });
    return Response.json({ ok: false, error: 'não consegui ler o artigo' }, { status: 502 });
  }
  if (!article) {
    return Response.json({ ok: false, error: 'artigo não existe' }, { status: 404 });
  }

  const objectPath = audioObjectPath(slug, extension as 'ogg' | 'mp3', fingerprint);
  const { data, error } = await admin.storage
    .from(AUDIO_BUCKET)
    .createSignedUploadUrl(objectPath, { upsert: true });

  if (error || !data) {
    console.error('[api/artigos/audio/direto] assinatura falhou', { message: error?.message });
    return Response.json({ ok: false, error: 'não consegui assinar o upload' }, { status: 502 });
  }

  return Response.json(
    {
      ok: true,
      slug,
      path: objectPath,
      token: data.token,
      signedUrl: data.signedUrl,
      supabaseUrl: publicSupabaseEnv().url,
      contentType: audioMimeType(extension as 'ogg' | 'mp3'),
    },
    { status: 200 },
  );
}

export async function PUT(request: Request, { params }: Params) {
  if (unauthorized(request)) {
    return Response.json({ ok: false, error: 'não autorizado' }, { status: 401 });
  }

  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 90) {
    return Response.json({ ok: false, error: 'slug inválido' }, { status: 400 });
  }

  const payload = await body(request);
  const objectPath = String(payload.path ?? '');
  const seconds = audioSeconds(String(payload.seconds ?? ''));
  // Os episódios que o áudio cita ("o link está na descrição"). Ausente não
  // mexe no que está gravado; formato errado recusa antes de tocar no artigo.
  const refs = podcastRefs(payload.refs, slug);
  if (refs === null) {
    return Response.json(
      { ok: false, error: 'refs precisa ser lista de até 3 slugs de outros episódios' },
      { status: 400 },
    );
  }

  // O caminho tem que ser o que ESTE slug geraria. Sem isso, um token válido
  // para um artigo publicaria áudio em outro.
  if (!objectPath.startsWith(`${slug}-`) || !/\.mp3$/.test(objectPath)) {
    return Response.json({ ok: false, error: 'path não é deste artigo' }, { status: 400 });
  }

  const admin = adminClient();
  const url = audioPublicUrl(publicSupabaseEnv().url, objectPath);

  // A prova de que o upload chegou inteiro: o primeiro quilobyte, pelo bucket
  // público, com a assinatura do formato. Objeto que não existe devolve 400 ou
  // 404 aqui, e aí o artigo não é alterado.
  let head: Buffer;
  try {
    const probe = await fetch(url, { headers: { range: 'bytes=0-1023' }, cache: 'no-store' });
    if (!probe.ok && probe.status !== 206) {
      return Response.json(
        { ok: false, error: `o bucket não serve o objeto (HTTP ${probe.status})` },
        { status: 409 },
      );
    }
    head = Buffer.from(await probe.arrayBuffer());
  } catch {
    return Response.json({ ok: false, error: 'não consegui conferir o objeto' }, { status: 502 });
  }

  const isOgg = objectPath.endsWith('.ogg');
  const playable = isOgg
    ? head.subarray(0, 4).toString('latin1') === 'OggS'
    : head.subarray(0, 3).toString('latin1') === 'ID3' ||
      (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);

  if (head.byteLength < 1024 || !playable) {
    return Response.json(
      { ok: false, error: 'o objeto no bucket não começa como áudio tocável' },
      { status: 409 },
    );
  }

  const { data: article, error: lookup } = await admin
    .from('articles')
    .select('slug, audio_path')
    .eq('slug', slug)
    .maybeSingle();

  if (lookup || !article) {
    return Response.json({ ok: false, error: 'artigo não existe' }, { status: 404 });
  }

  const { error: write } = await admin
    .from('articles')
    .update({
      audio_path: objectPath,
      audio_seconds: seconds,
      ...(refs !== undefined ? { podcast_refs: refs } : {}),
    })
    .eq('slug', slug);

  if (write) {
    console.error('[api/artigos/audio/direto] gravação falhou', { code: write.code });
    return Response.json({ ok: false, error: 'não consegui gravar o caminho' }, { status: 502 });
  }

  // O antigo sai depois de a página já apontar para o novo, e falhar aqui não
  // reprova o pedido: sobra objeto velho no bucket e o leitor já ouve o certo.
  if (article.audio_path && article.audio_path !== objectPath) {
    const { error: sweep } = await admin.storage.from(AUDIO_BUCKET).remove([article.audio_path]);
    if (sweep) console.warn('[api/artigos/audio/direto] sobrou o áudio antigo', { slug });
  }

  console.log('[api/artigos/audio/direto] no ar', { slug, seconds, path: objectPath });
  return Response.json({ ok: true, slug, url, seconds }, { status: 201 });
}
