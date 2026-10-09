/**
 * Qual imagem vai na capa de um artigo, sem banco e sem request.
 *
 * O cron escreve o tema como quiser ("VO2", "passos", "glicose"); a capa só
 * existe para uma lista fechada de temas. Então o tema passa por aqui, vira
 * um da lista, e a capa sai entre as daquele tema, dando preferência à que
 * foi menos usada: dois artigos de sono seguidos não chegam com a mesma cama.
 */

export const TOPICS = [
  'sono',
  'recuperacao',
  'cardiovascular',
  'pressao',
  'metabolismo',
  'alimentacao',
  'proteina',
  'forca',
  'cardio',
  'movimento',
  'alcool',
  'composicao-corporal',
  'estresse',
  'hidratacao',
  'longevidade',
] as const;

export type Topic = (typeof TOPICS)[number];

export type Cover = { id: string; topics: readonly Topic[]; alt: string };

const LABELS: Record<Topic, string> = {
  sono: 'Sono',
  recuperacao: 'Recuperação',
  cardiovascular: 'Coração',
  pressao: 'Pressão',
  metabolismo: 'Metabolismo',
  alimentacao: 'Alimentação',
  proteina: 'Proteína',
  forca: 'Força',
  cardio: 'Condicionamento',
  movimento: 'Movimento',
  alcool: 'Álcool',
  'composicao-corporal': 'Composição corporal',
  estresse: 'Estresse',
  hidratacao: 'Hidratação',
  longevidade: 'Longevidade',
};

/** O rótulo do card: o tema do cron, normalizado e escrito como se lê. */
export function topicLabel(raw: string | null | undefined): string {
  return LABELS[normalizeTopic(raw)];
}

const FALLBACK: Topic = 'longevidade';

// Sinônimos que o cron já usou ou tende a usar. A chave é a forma sem acento,
// minúscula e com hífen; basta um pedaço da chave aparecer no tema.
const ALIASES: Array<[string, Topic]> = [
  ['sono', 'sono'],
  ['insonia', 'sono'],
  ['vfc', 'recuperacao'],
  ['recuperacao', 'recuperacao'],
  ['hrv', 'recuperacao'],
  ['sauna', 'recuperacao'],
  ['cardiovascular', 'cardiovascular'],
  ['colesterol', 'cardiovascular'],
  ['apob', 'cardiovascular'],
  ['coracao', 'cardiovascular'],
  ['pressao', 'pressao'],
  ['hipertensao', 'pressao'],
  ['glicose', 'metabolismo'],
  ['glicemia', 'metabolismo'],
  ['insulina', 'metabolismo'],
  ['metabol', 'metabolismo'],
  ['diabetes', 'metabolismo'],
  ['proteina', 'proteina'],
  ['aliment', 'alimentacao'],
  ['nutri', 'alimentacao'],
  ['dieta', 'alimentacao'],
  ['forca', 'forca'],
  ['musculo', 'forca'],
  ['musculacao', 'forca'],
  ['vo2', 'cardio'],
  ['aerob', 'cardio'],
  ['cardio', 'cardio'],
  ['corrida', 'cardio'],
  ['treino', 'cardio'],
  ['condicionamento', 'cardio'],
  ['exercicio', 'cardio'],
  ['atividade', 'movimento'],
  ['passos', 'movimento'],
  ['caminhada', 'movimento'],
  ['sedentar', 'movimento'],
  ['movimento', 'movimento'],
  ['alcool', 'alcool'],
  ['vinho', 'alcool'],
  ['composicao', 'composicao-corporal'],
  ['gordura', 'composicao-corporal'],
  ['peso', 'composicao-corporal'],
  ['estresse', 'estresse'],
  ['cortisol', 'estresse'],
  ['ansiedade', 'estresse'],
  ['hidrat', 'hidratacao'],
  ['agua', 'hidratacao'],
  ['longevidade', 'longevidade'],
];

function bare(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeTopic(raw: string | null | undefined): Topic {
  const value = bare(raw ?? '');
  if (!value) return FALLBACK;
  if ((TOPICS as readonly string[]).includes(value)) return value as Topic;

  // "treino-de-forca" casa com "treino" (cardio) e com "forca". O mais
  // específico, o que aparece mais tarde no nome, é o que o autor quis dizer.
  let best: { topic: Topic; at: number } | undefined;
  for (const [key, topic] of ALIASES) {
    const at = value.lastIndexOf(key);
    if (at >= 0 && (!best || at > best.at)) best = { topic, at };
  }
  return best?.topic ?? FALLBACK;
}

/** FNV-1a de 32 bits: estável entre execuções, que é tudo o que o desempate pede. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * A capa de um artigo novo. `usage` conta quantos artigos já usam cada capa.
 * Devolve `undefined` só com um catálogo vazio.
 */
export function pickCover(
  rawTopic: string | null | undefined,
  usage: Record<string, number>,
  slug: string,
  catalog: readonly Cover[],
): string | undefined {
  const topic = normalizeTopic(rawTopic);
  let pool = catalog.filter((cover) => cover.topics.includes(topic));
  if (pool.length === 0) pool = catalog.filter((cover) => cover.topics.includes(FALLBACK));
  if (pool.length === 0) pool = [...catalog];
  if (pool.length === 0) return undefined;

  const least = Math.min(...pool.map((cover) => usage[cover.id] ?? 0));
  const tied = pool.filter((cover) => (usage[cover.id] ?? 0) === least);
  return tied[hash(slug) % tied.length].id;
}
