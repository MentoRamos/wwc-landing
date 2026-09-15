/**
 * Dates, written for the person reading them.
 *
 * Every date this platform shows belongs to somebody living in Brazil. The
 * server rendering it does not: Vercel runs UTC, and `toLocaleDateString`
 * with no timezone silently uses the runtime's. A subscription expiring at
 * 02:00 UTC was printed as the 11th to a member who, in São Paulo, was still
 * on the 10th.
 *
 * That is the worst shape a bug can have — nobody reports it, they just
 * believe the wrong date until the day their access ends when they thought
 * they had one more. So the timezone lives here, once, instead of being an
 * option three call sites remembered and three others forgot.
 */

const ZONE = 'America/Sao_Paulo';

/**
 * Uma coluna `date` chega como `2026-09-15`, sem hora e sem fuso.
 *
 * `new Date()` lê isso como meia-noite UTC, e aí a conversão para São Paulo,
 * que existe e está certa para instante, joga a data para o dia anterior. O
 * report emitido no dia 15 aparece como 14 — e é um defeito silencioso, porque
 * ninguém reclama de uma data plausível, só acredita nela.
 *
 * Data pura não é instante: ela não tem fuso para converter. Interpretada como
 * meio-dia UTC, ela cai no mesmo dia civil em qualquer fuso entre -11 e +11, o
 * que inclui o Brasil inteiro com folga de horas.
 */
const SOMENTE_DATA = /^\d{4}-\d{2}-\d{2}$/;

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null;

  if (typeof value === 'string' && SOMENTE_DATA.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `10/09/2026`, in São Paulo. Empty string when there is nothing to show. */
export function formatDate(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', { timeZone: ZONE });
}

/** `14 de setembro de 2026`, in São Paulo: the date line of a publication. */
export function formatLongDate(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', {
    timeZone: ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** `quinta-feira, 17 de setembro às 20:00`, in São Paulo. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '';
  return date.toLocaleString('pt-BR', {
    timeZone: ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * O dia civil da data, em São Paulo, como `2026-09-14`.
 *
 * `en-CA` é o único locale que emite YYYY-MM-DD, e é por isso que ele está
 * aqui — não por ter a ver com o Canadá.
 */
export function civilDateISO(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: ZONE });
}

/**
 * `Hoje`, `Amanhã`, `Em 3 dias` — a distância até uma data, em dias de calendário.
 *
 * O ponto é o calendário, não a duração. Faltar 26 horas para o encontro pode
 * ser "amanhã" ou "depois de amanhã" dependendo da hora do dia, e é o dia que
 * a pessoa usa para se organizar. Então a conta é feita sobre a data civil de
 * São Paulo dos dois lados.
 *
 * É a mesma armadilha de fuso do resto do arquivo, virada do avesso: às 22:00
 * de quarta em São Paulo o servidor em UTC já está na quinta, e um encontro de
 * quinta apareceria como "Hoje" para quem ainda está na quarta.
 */
function civilDay(date: Date): number {
  const [year, month, day] = civilDateISO(date).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function countdownLabel(
  value: string | Date | null | undefined,
  now: Date,
): string {
  const target = parse(value);
  if (!target) return '';

  const days = Math.round((civilDay(target) - civilDay(now)) / DAY_MS);

  if (days < 0) return '';
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  return `Em ${days} dias`;
}
