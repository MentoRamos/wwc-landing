/**
 * The Circle's prices and its checkout link, with no request and no database.
 *
 * The subscription is the product that exists to fill the Protocol's idle
 * places, so the page that sells it is the one page on the platform whose
 * details are worth pinning with tests: a wrong price or a dead link costs
 * money directly.
 */

export type CirclePlan = {
  id: 'mensal' | 'trimestral';
  label: string;
  priceCents: number;
  months: number;
  /** Which environment variable holds this plan's Kiwify link. */
  envKey: 'KIWIFY_CHECKOUT_MENSAL' | 'KIWIFY_CHECKOUT_TRIMESTRAL';
};

export const CIRCLE_PLANS: readonly CirclePlan[] = [
  {
    id: 'mensal',
    label: 'Mensal',
    priceCents: 24_700,
    months: 1,
    envKey: 'KIWIFY_CHECKOUT_MENSAL',
  },
  {
    id: 'trimestral',
    label: 'Trimestral',
    priceCents: 59_700,
    months: 3,
    envKey: 'KIWIFY_CHECKOUT_TRIMESTRAL',
  },
];

/** `R$ 247`, and `R$ 247,50` only when there are cents to show. */
export function priceLabel(cents: number): string {
  const reais = Math.trunc(cents / 100);
  const rest = cents % 100;
  if (rest === 0) return `R$ ${reais.toLocaleString('pt-BR')}`;
  return `R$ ${reais.toLocaleString('pt-BR')},${String(rest).padStart(2, '0')}`;
}

/**
 * The checkout link, carrying who is buying when we know.
 *
 * Somebody paying with one address and signing in with another is the
 * commonest way a person ends up staring at an empty page after paying.
 * Passing the account id through the checkout lets the webhook match on the
 * id instead of hoping the two addresses agree.
 *
 * Returns null for anything that is not an https URL. The base comes from the
 * environment, so a typo becomes a link on a page that sells — and a
 * `javascript:` or somebody else's host must never be what renders.
 */
export function checkoutUrl(
  base: string | undefined,
  who: { userId?: string; email?: string },
): string | null {
  if (!base?.trim()) return null;

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  if (!who.userId) return url.toString();

  url.searchParams.set('ww_uid', who.userId);
  if (who.email) url.searchParams.set('email', who.email);
  return url.toString();
}

/**
 * The next live meeting: Thursday at 20:00 in São Paulo.
 *
 * Brazil dropped daylight saving in 2019, so the offset is a flat UTC-3 and
 * this can be arithmetic rather than a timezone library. If that ever changes
 * this is the one place to fix.
 *
 * A meeting already under way still counts as the next one for two hours —
 * somebody opening the page at 20:10 on a Thursday wants tonight's link, not
 * one for next week.
 */
const MEETING_WEEKDAY = 4; // Thursday, in UTC terms below
const MEETING_HOUR_UTC = 23; // 20:00 in São Paulo, which is UTC-3
const RUNNING_FOR_MS = 2 * 60 * 60 * 1000;

export function nextMeeting(now: Date): Date {
  const candidate = new Date(now);
  candidate.setUTCHours(MEETING_HOUR_UTC, 0, 0, 0);

  const daysAhead = (MEETING_WEEKDAY - candidate.getUTCDay() + 7) % 7;
  candidate.setUTCDate(candidate.getUTCDate() + daysAhead);

  // Today was the day but the meeting has already finished: go a week on.
  if (candidate.getTime() + RUNNING_FOR_MS <= now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 7);
  }
  return candidate;
}
