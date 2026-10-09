/**
 * O áudio do artigo: onde o arquivo mora, como se chama e como se escreve a
 * duração na tela.
 *
 * Tudo aqui é função pura, sem rede e sem Supabase, porque é a parte que o
 * endpoint de ingestão e a página precisam concordar byte a byte. Um caminho
 * calculado de dois jeitos diferentes em dois arquivos é um player apontando
 * para 404.
 */

export const AUDIO_BUCKET = 'article-audio';

/** O mesmo teto do bucket (`file_size_limit`), repetido para recusar antes de subir. */
export const AUDIO_MAX_BYTES = 25 * 1024 * 1024;

/**
 * Um áudio pequeno demais é erro mandado como sucesso: roteiro vazio, síntese
 * que voltou sem a parte de áudio, redirecionamento de login salvo em disco.
 * Nada que valha a pena ocupa menos que isto.
 */
export const AUDIO_MIN_BYTES = 8 * 1024;

const EXTENSIONS: Record<string, 'ogg' | 'mp3'> = {
  'audio/ogg': 'ogg',
  'audio/opus': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
};

/** O `content-type` que o bucket aceita, para os dois tipos que o navegador toca. */
export function audioMimeType(extension: 'ogg' | 'mp3'): string {
  return extension === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
}

/**
 * A extensão a partir do `content-type` do pedido, ou `null` para formato que
 * não serve.
 *
 * `audio/ogg; codecs=opus` é o que o ffmpeg e o curl mandam, então o
 * parâmetro depois do ponto e vírgula é descartado antes de comparar.
 */
export function audioExtension(contentType: string | null | undefined): 'ogg' | 'mp3' | null {
  const type = contentType?.split(';')[0]?.trim().toLowerCase();
  if (!type) return null;
  return EXTENSIONS[type] ?? null;
}

/**
 * O nome do objeto no bucket: slug, impressão digital do conteúdo, extensão.
 *
 * A impressão digital é o que torna o cache de um ano seguro. Áudio novo para
 * o mesmo artigo gera outro nome, então ninguém ouve a versão velha por conta
 * de um CDN que ainda não expirou — e reenviar o MESMO arquivo cai no mesmo
 * nome, sem lixo acumulado no bucket.
 */
export function audioObjectPath(
  slug: string,
  extension: 'ogg' | 'mp3',
  fingerprint: string,
): string {
  return `${slug}-${fingerprint.slice(0, 8).toLowerCase()}.${extension}`;
}

/** A URL que o `<audio>` da página consome, servida pelo bucket público. */
export function audioPublicUrl(supabaseUrl: string, objectPath: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${AUDIO_BUCKET}/${objectPath}`;
}

/**
 * A duração declarada por quem subiu o arquivo (cabeçalho `x-audio-seconds`).
 *
 * Ela só serve para a tela dizer "10 min" antes de baixar 3 MB: o `<audio>`
 * corrige sozinho quando os metadados chegam. Então número torto é descartado
 * em silêncio, nunca motivo para recusar o áudio.
 */
export function audioSeconds(header: string | null | undefined): number | null {
  const value = Number(header?.trim());
  if (!Number.isFinite(value)) return null;
  const seconds = Math.round(value);
  return seconds >= 1 && seconds <= 7200 ? seconds : null;
}

/** `9:04`, e `1:02:03` quando passa de uma hora. */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const pad = (value: number) => String(value).padStart(2, '0');
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(total % 60)}`
    : `${minutes}:${pad(total % 60)}`;
}

/**
 * A duração ao lado do botão, antes de alguém apertar play: "10 min", e
 * "1 min" no arredondamento para baixo de um episódio curto.
 */
export function audioLength(seconds: number | null | undefined): string | null {
  if (!seconds || seconds < 1) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
