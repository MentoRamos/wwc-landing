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

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `10/09/2026`, in São Paulo. Empty string when there is nothing to show. */
export function formatDate(value: string | Date | null | undefined): string {
  const date = parse(value);
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', { timeZone: ZONE });
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
