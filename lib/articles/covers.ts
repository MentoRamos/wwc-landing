import { pickCover, type Cover } from '@/lib/core/covers.core';

/**
 * O banco de capas dos artigos. Cada `id` tem três arquivos em
 * `public/photos/artigos/`: `-1600.webp` e `-800.webp` para a página e
 * `-1200.jpg` para o cartão de link (o gerador do cartão não lê WebP).
 *
 * Geradas por IA em 15/09/2026, todas com o mesmo prompt de estilo (still life
 * editorial, luz lateral, tons quentes, sem pessoa, sem texto) e revisadas uma
 * a uma. Imagem nova entra aqui com os temas dela; `tests/covers.test.ts` exige
 * os três arquivos e pelo menos duas capas por tema.
 */
export const COVERS: readonly Cover[] = [
  { id: 'sono-cama-amanhecer', topics: ['sono', 'recuperacao'], alt: 'Cama desfeita ao amanhecer e um relógio no criado-mudo' },
  { id: 'sono-quarto-noite', topics: ['sono'], alt: 'Criado-mudo com livro e copo de água num quarto escuro à noite' },
  { id: 'recuperacao-anel-relogio', topics: ['recuperacao'], alt: 'Anel e relógio de monitoramento sobre linho na luz da manhã' },
  { id: 'recuperacao-sauna', topics: ['recuperacao', 'estresse'], alt: 'Banco de sauna de madeira com uma toalha dobrada e vapor' },
  { id: 'cardiovascular-estetoscopio', topics: ['cardiovascular', 'pressao'], alt: 'Estetoscópio enrolado sobre uma mesa de couro escuro' },
  { id: 'cardiovascular-tubos', topics: ['cardiovascular', 'metabolismo'], alt: 'Tubos de coleta de sangue num suporte de madeira' },
  { id: 'pressao-aparelho', topics: ['pressao'], alt: 'Aparelho de pressão de braço sobre uma mesa de madeira' },
  { id: 'pressao-poltrona', topics: ['pressao', 'estresse'], alt: 'Poltrona de couro numa sala escura com luz de fim de tarde' },
  { id: 'metabolismo-acucar', topics: ['metabolismo'], alt: 'Cubos de açúcar e uma colher sobre ardósia escura' },
  { id: 'metabolismo-aveia', topics: ['metabolismo', 'alimentacao'], alt: 'Tigela de aveia com mirtilos sobre bancada de pedra' },
  { id: 'alimentacao-peixe', topics: ['alimentacao', 'proteina'], alt: 'Prato de peixe grelhado com folhas verdes e azeite' },
  { id: 'alimentacao-feira', topics: ['alimentacao'], alt: 'Alcachofras, folhas verdes e azeite sobre uma tábua' },
  { id: 'proteina-ovos', topics: ['proteina'], alt: 'Ovos numa tigela de cerâmica ao lado de uma frigideira de ferro' },
  { id: 'proteina-salmao', topics: ['proteina', 'alimentacao'], alt: 'Filé de salmão cru com sal grosso e endro sobre ardósia' },
  { id: 'forca-halteres', topics: ['forca'], alt: 'Par de halteres de ferro num piso de concreto de academia vazia' },
  { id: 'forca-barra', topics: ['forca'], alt: 'Barra com anilhas no chão de uma academia escura' },
  { id: 'cardio-tenis', topics: ['cardio', 'movimento'], alt: 'Tênis de corrida sobre asfalto molhado ao amanhecer' },
  { id: 'cardio-remo', topics: ['cardio'], alt: 'Remo ergométrico de madeira numa academia vazia' },
  { id: 'movimento-escada', topics: ['movimento', 'longevidade'], alt: 'Escadaria de pedra antiga na luz da manhã' },
  { id: 'movimento-sapatos', topics: ['movimento'], alt: 'Sapatos de couro gastos junto a uma porta entreaberta' },
  { id: 'alcool-taca', topics: ['alcool'], alt: 'Taça de vinho tinto sobre uma mesa de madeira escura' },
  { id: 'alcool-whisky', topics: ['alcool'], alt: 'Copo de uísque com uma pedra de gelo sobre um balcão' },
  { id: 'composicao-fita', topics: ['composicao-corporal'], alt: 'Fita métrica de costura enrolada sobre linho escuro' },
  { id: 'composicao-balanca', topics: ['composicao-corporal'], alt: 'Balança antiga de pratos de latão sobre uma mesa' },
  { id: 'estresse-cha', topics: ['estresse'], alt: 'Xícara de chá na janela com gotas de chuva no vidro' },
  { id: 'estresse-caderno', topics: ['estresse'], alt: 'Caderno aberto e caneta tinteiro sob um abajur à noite' },
  { id: 'hidratacao-jarra', topics: ['hidratacao'], alt: 'Jarra e copo de água sobre madeira na luz da manhã' },
  { id: 'hidratacao-copo', topics: ['hidratacao'], alt: 'Copo de água gelada com uma rodela de limão' },
  { id: 'longevidade-oliveira', topics: ['longevidade'], alt: 'Galho de oliveira num vaso de cerâmica escura' },
  { id: 'longevidade-ampulheta', topics: ['longevidade'], alt: 'Ampulheta de latão e vidro sobre uma mesa de madeira' },
];

const BY_ID = new Map(COVERS.map((cover) => [cover.id, cover]));

export function findCover(id: string | null | undefined): Cover | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function coverSrc(id: string, width: 800 | 1600 | 1200): string {
  return `/photos/artigos/${id}-${width}.${width === 1200 ? 'jpg' : 'webp'}`;
}

/**
 * A capa de um artigo, sempre com imagem.
 *
 * `cover_key` vem do banco; se estiver vazio ou apontar para um id que saiu do
 * catálogo, a capa sai da mesma escolha que o endpoint faria pelo tema. A página
 * nunca fica sem imagem e nunca quebra por causa de uma.
 */
export function resolveCover(article: {
  slug: string;
  topic: string | null;
  cover_key: string | null;
}): Cover {
  return (
    findCover(article.cover_key) ??
    findCover(pickCover(article.topic, {}, article.slug, COVERS)) ??
    COVERS[0]
  );
}
