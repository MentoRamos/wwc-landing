import { createHash } from 'node:crypto';
import { adminClient } from '@/lib/supabase/admin';
import { publicSupabaseEnv } from '@/lib/supabase/env';
import { cronAuthorized } from '@/lib/cron-auth';
import {
  AUDIO_BUCKET,
  AUDIO_MAX_BYTES,
  AUDIO_MIN_BYTES,
  audioExtension,
  audioMimeType,
  audioObjectPath,
  audioPublicUrl,
  audioSeconds,
  publishableAudio,
} from '@/lib/core/audio.core';

/**
 * Onde o servidor sobe o "ouvir o artigo" já sintetizado.
 *
 *     POST /api/artigos/<slug>/audio
 *     content-type: audio/ogg
 *     authorization: Bearer $ARTICLES_INGEST_TOKEN
 *     x-audio-seconds: 604            (opcional, só para a tela)
 *     <bytes do arquivo>
 *
 * Mesmo token do texto, de propósito: quem pode publicar um artigo sem
 * revisão humana já pode publicar o áudio dele. Nenhum poder novo entra no
 * servidor da OpenClaw, e a chave de service role continua só na Vercel.
 *
 * O DELETE existe pelo mesmo motivo que `hidden_at` existe: quando a voz sai
 * errada, tirar o áudio do ar não pode depender de um deploy. Sem áudio a
 * página volta sozinha para a voz do aparelho, que é feia mas funciona.
 *
 * O que este endpoint recusa, e por quê:
 * - formato fora de ogg/mp3: o bucket recusaria depois, com erro pior;
 * - arquivo grande demais, medido no corpo e não no cabeçalho, que pode mentir;
 * - arquivo pequeno demais ou sem a assinatura do formato: síntese que voltou
 *   vazia e página de erro salva em disco chegam aqui com cara de áudio, e um
 *   player quebrado é pior que um botão que não existe;
 * - slug que não é artigo: 404, sem criar nada.
 */
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A assinatura do arquivo, lida dos primeiros bytes.
 *
 * Ogg começa em `OggS`. MP3 começa em `ID3` (com tag) ou no sync de um quadro
 * (`0xFF` seguido de três bits ligados). É verificação de formato, não de
 * segurança: o bucket é público e serve o que recebe, então o que entra aqui
 * precisa ser o que o `<audio>` sabe tocar.
 */
function looksLikeAudio(bytes: Buffer, extension: 'ogg' | 'mp3'): boolean {
  if (extension === 'ogg') return bytes.subarray(0, 4).toString('latin1') === 'OggS';
  return (
    bytes.subarray(0, 3).toString('latin1') === 'ID3' ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  );
}

export async function POST(request: Request, { params }: Params) {
  if (!cronAuthorized(request.headers.get('authorization'), process.env.ARTICLES_INGEST_TOKEN)) {
    return Response.json({ ok: false, error: 'não autorizado' }, { status: 401 });
  }

  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 90) {
    return Response.json({ ok: false, error: 'slug inválido' }, { status: 400 });
  }

  const extension = audioExtension(request.headers.get('content-type'));
  if (!extension) {
    return Response.json(
      { ok: false, error: 'content-type precisa ser audio/ogg ou audio/mpeg' },
      { status: 415 },
    );
  }
  if (!publishableAudio(extension)) {
    // Ogg toca no site, mas tira o episódio do Spotify. Ver publishableAudio.
    return Response.json(
      { ok: false, error: 'só audio/mpeg: ogg tira o episódio do feed do Spotify' },
      { status: 415 },
    );
  }

  // O cabeçalho recusa antes de baixar o corpo; o corpo é medido depois,
  // porque o cabeçalho pode faltar ou mentir.
  if (Number(request.headers.get('content-length') ?? 0) > AUDIO_MAX_BYTES) {
    return Response.json({ ok: false, error: 'áudio grande demais' }, { status: 413 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.byteLength > AUDIO_MAX_BYTES) {
    return Response.json({ ok: false, error: 'áudio grande demais' }, { status: 413 });
  }
  if (bytes.byteLength < AUDIO_MIN_BYTES || !looksLikeAudio(bytes, extension)) {
    return Response.json(
      { ok: false, error: `isto não é um ${extension} tocável` },
      { status: 400 },
    );
  }

  const admin = adminClient();

  // O artigo precisa existir antes do upload: caminho de objeto é derivado do
  // slug, e um slug errado deixaria arquivo órfão de 3 MB no bucket para
  // sempre, sem nenhuma linha apontando para ele.
  const { data: article, error: lookup } = await admin
    .from('articles')
    .select('slug, audio_path')
    .eq('slug', slug)
    .maybeSingle();

  if (lookup) {
    console.error('[api/artigos/audio] leitura falhou', { code: lookup.code });
    return Response.json({ ok: false, error: 'não consegui ler o artigo' }, { status: 502 });
  }
  if (!article) {
    return Response.json({ ok: false, error: 'artigo não existe' }, { status: 404 });
  }

  const fingerprint = createHash('sha256').update(bytes).digest('hex');
  const objectPath = audioObjectPath(slug, extension, fingerprint);
  const seconds = audioSeconds(request.headers.get('x-audio-seconds'));

  const { error: upload } = await admin.storage.from(AUDIO_BUCKET).upload(objectPath, bytes, {
    contentType: audioMimeType(extension),
    // Um ano, e seguro porque o nome do objeto carrega a impressão digital do
    // conteúdo: áudio novo nunca reusa o nome do velho.
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: true,
  });
  if (upload) {
    console.error('[api/artigos/audio] upload falhou', { message: upload.message });
    return Response.json({ ok: false, error: 'não consegui subir o áudio' }, { status: 502 });
  }

  const { error: write } = await admin
    .from('articles')
    .update({ audio_path: objectPath, audio_seconds: seconds })
    .eq('slug', slug);

  if (write) {
    // A coluna é a única coisa que faz a página tocar o arquivo. Sem ela o
    // objeto é invisível, então ele sai junto em vez de ficar pago e inútil.
    await admin.storage.from(AUDIO_BUCKET).remove([objectPath]);
    console.error('[api/artigos/audio] gravação falhou', { code: write.code });
    return Response.json({ ok: false, error: 'não consegui gravar o caminho' }, { status: 502 });
  }

  // O áudio anterior sai depois de a página já apontar para o novo, e a falha
  // aqui não reprova o pedido: sobra um objeto velho no bucket, e o leitor já
  // está ouvindo a versão certa.
  if (article.audio_path && article.audio_path !== objectPath) {
    const { error: sweep } = await admin.storage
      .from(AUDIO_BUCKET)
      .remove([article.audio_path]);
    if (sweep) console.warn('[api/artigos/audio] sobrou o áudio antigo', { slug });
  }

  const url = audioPublicUrl(publicSupabaseEnv().url, objectPath);
  console.log('[api/artigos/audio] no ar', { slug, bytes: bytes.byteLength, seconds });
  return Response.json({ ok: true, slug, url, bytes: bytes.byteLength, seconds }, { status: 201 });
}

export async function DELETE(request: Request, { params }: Params) {
  if (!cronAuthorized(request.headers.get('authorization'), process.env.ARTICLES_INGEST_TOKEN)) {
    return Response.json({ ok: false, error: 'não autorizado' }, { status: 401 });
  }

  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 90) {
    return Response.json({ ok: false, error: 'slug inválido' }, { status: 400 });
  }

  const admin = adminClient();
  const { data: article } = await admin
    .from('articles')
    .select('slug, audio_path')
    .eq('slug', slug)
    .maybeSingle();

  if (!article) {
    return Response.json({ ok: false, error: 'artigo não existe' }, { status: 404 });
  }
  if (!article.audio_path) {
    return Response.json({ ok: true, slug, removed: false }, { status: 200 });
  }

  // A coluna primeiro: enquanto ela aponta para um objeto apagado, a página
  // mostra um player que não toca. Sem a coluna, ela volta para a voz do
  // aparelho na mesma requisição.
  const { error: write } = await admin
    .from('articles')
    .update({ audio_path: null, audio_seconds: null })
    .eq('slug', slug);

  if (write) {
    console.error('[api/artigos/audio] limpeza falhou', { code: write.code });
    return Response.json({ ok: false, error: 'não consegui limpar o caminho' }, { status: 502 });
  }

  await admin.storage.from(AUDIO_BUCKET).remove([article.audio_path]);
  console.log('[api/artigos/audio] fora do ar', { slug });
  return Response.json({ ok: true, slug, removed: true }, { status: 200 });
}
