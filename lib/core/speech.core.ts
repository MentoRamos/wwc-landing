/**
 * O que a voz do navegador lê quando alguém aperta "Ouvir".
 *
 * Duas coisas decidem a forma. A primeira: a voz lê o que recebe, então
 * `**`, `##` e URL têm de sumir antes, senão ela diz "asterisco asterisco".
 * A segunda: o Chrome interrompe uma fala longa por volta dos 15 segundos, sem
 * erro. Por isso o texto vai em pedaços de uma ou poucas frases, enfileirados
 * um atrás do outro, o que também dá ao botão um "onde parei" para pausar.
 */

const MAX_CHUNK = 260;

function plain(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/, '')
    .replace(/[*_`~#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function withStop(text: string): string {
  return /[.!?:;]$/.test(text) ? text : `${text}.`;
}

function split(paragraph: string): string[] {
  if (paragraph.length <= MAX_CHUNK) return [paragraph];

  const sentences = paragraph.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [paragraph];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences.map((s) => s.trim()).filter(Boolean)) {
    if (current && `${current} ${sentence}`.length > MAX_CHUNK) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);

  // Uma frase sozinha maior que o limite ainda precisa caber: corta na vírgula.
  return chunks.flatMap((chunk) =>
    chunk.length <= MAX_CHUNK
      ? [chunk]
      : (chunk.match(new RegExp(`.{1,${MAX_CHUNK}}(,|$)`, 'g')) ?? [chunk]).map((part) => part.trim()),
  );
}

export function speechChunks(title: string, dek: string, markdown: string): string[] {
  const paragraphs = markdown
    .split(/\n\s*\n|\n(?=\s{0,3}(?:[-*+]|\d+[.)])\s)/)
    .map((block) => block.split('\n').map(plain).filter(Boolean).join(' '))
    .filter((text) => text.length > 0 && !/^[-_*\s]+$/.test(text));

  return [withStop(plain(title)), withStop(plain(dek)), ...paragraphs.map(withStop)]
    .flatMap(split)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

/**
 * A âncora de uma seção. O sumário lateral e o `<h2>` do artigo usam esta
 * mesma função, então o link do sumário sempre acha o título.
 */
export function headingId(text: string): string {
  return plain(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** As seções `##` do artigo, na ordem, para o sumário "Neste artigo". */
export function articleHeadings(markdown: string): Array<{ id: string; text: string }> {
  const seen = new Map<string, number>();
  return markdown
    .split('\n')
    .filter((line) => /^##\s+\S/.test(line))
    .map((line) => {
      const text = plain(line);
      const base = headingId(text) || 'secao';
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      return { id: count === 1 ? base : `${base}-${count}`, text };
    });
}
