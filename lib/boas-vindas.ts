/**
 * Single source of truth for `/boas-vindas`, the members page of the W&W Circle
 * founding class (WhatsApp community, from 20/10/2026).
 *
 * Two things are not ready yet and the page renders a graceful placeholder
 * while they stay empty. Fill them in here and nowhere else.
 */

/** YouTube ID of Kauã's 60-90 s welcome video. Empty = "vídeo chega em breve". */
export const WELCOME_VIDEO_ID = '';

/** Where the free NIVA code is claimed. Empty = "em breve". */
export const NIVA_OFFER_URL = '';

/** Tag stored in `interest.source` for everyone who unlocks the guides here. */
export const BOAS_VINDAS_SOURCE = 'boas-vindas-circle';

/**
 * The guides live on kauaramos.com (`landing-kauaramos/materiais`), not in this
 * app, so the links are absolute. The page itself only ever runs behind that
 * domain.
 */
const MATERIAIS_BASE = 'https://kauaramos.com/materiais';

export const GUIAS = [
  { titulo: 'O Mínimo Inegociável', arquivo: 'o-minimo-inegociavel.pdf' },
  { titulo: 'Fim do Crash das 15h', arquivo: 'fim-do-crash-15h.pdf' },
  { titulo: 'Cardápio Sem Culpa', arquivo: 'cardapio-sem-culpa.pdf' },
  { titulo: 'Doce Sem Sabotagem', arquivo: 'doce-sem-sabotagem.pdf' },
  { titulo: 'O Mundo é a Academia', arquivo: 'o-mundo-e-a-academia.pdf' },
  { titulo: 'A Ficha da Hora Fixa', arquivo: 'a-ficha-da-hora-fixa.pdf' },
].map((guia) => ({ ...guia, href: `${MATERIAIS_BASE}/${guia.arquivo}` }));

export const DESAFIO = {
  nome: 'Desafio 21 dias: suba seu HRV',
  inicio: 'segunda, 26/10',
  fim: 'domingo, 15/11',
  etapas: [
    {
      rotulo: 'Dia 0 · domingo, 25/10',
      texto: 'Cada um posta o HRV médio e o sono médio dos últimos 7 dias. É o seu ponto de partida.',
    },
    {
      rotulo: 'Semana 1 · 26/10 a 01/11',
      texto: 'Hora fixa de dormir e de acordar. Só isso.',
    },
    {
      rotulo: 'Semana 2 · 02/11 a 08/11',
      texto: 'O fim do crash das 15h.',
    },
    {
      rotulo: 'Semana 3 · 09/11 a 15/11',
      texto: 'O mínimo inegociável: proteína e movimento, todo dia.',
    },
    {
      rotulo: 'Dia 21 · domingo, 15/11',
      texto: 'Posta de novo o HRV e o sono médios. Os 10 que completarem ganham 15 minutos de leitura individual dos números com o Kauã.',
    },
  ],
} as const;
