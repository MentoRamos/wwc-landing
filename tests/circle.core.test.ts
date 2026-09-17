import { describe, expect, it } from 'vitest';
import { CIRCLE_PLANS, checkoutUrl, holdsCircle, nextMeeting, priceLabel } from '@/lib/core/circle.core';

describe('CIRCLE_PLANS', () => {
  it('carries the two prices Kauã set, in cents', () => {
    expect(CIRCLE_PLANS.map((p) => [p.id, p.priceCents, p.months])).toEqual([
      ['mensal', 24700, 1],
      ['trimestral', 59700, 3],
    ]);
  });

  it('says what the quarterly actually saves, rather than a round number', () => {
    const [monthly, quarterly] = CIRCLE_PLANS;
    expect(quarterly.priceCents).toBeLessThan(monthly.priceCents * quarterly.months);
  });
});

describe('priceLabel', () => {
  it('writes reais the way a Brazilian reads them', () => {
    expect(priceLabel(24700)).toBe('R$ 247');
    expect(priceLabel(59700)).toBe('R$ 597');
  });

  it('shows the cents only when there are any', () => {
    expect(priceLabel(24750)).toBe('R$ 247,50');
    expect(priceLabel(100)).toBe('R$ 1');
  });
});

/**
 * Paying with one address and signing in with another is the commonest way
 * somebody ends up staring at an empty page after paying. Carrying the
 * account id into the checkout is what closes most of that gap before it
 * opens — the webhook can then match on the id instead of hoping the two
 * addresses agree.
 *
 * The id has to travel in a parameter Kiwify actually keeps. Their checkout
 * accepts exactly `src`, `sck`, `utm_source`, `utm_medium`, `utm_campaign`,
 * `utm_term`, `utm_content`, `s1`, `s2` and `s3`, stores them against the
 * order, and drops everything else. A homemade `ww_uid` would render on the
 * page, survive the click, and then simply not exist by the time the money
 * moved — which is the same as not carrying the id at all, except it looks
 * like it works. `sck` is the free-form one, so `sck` is what we use.
 */
describe('checkoutUrl', () => {
  const base = 'https://pay.kiwify.com.br/abc123';

  it('carries the account id into the checkout', () => {
    expect(checkoutUrl(base, { userId: 'u-1' })).toBe(
      'https://pay.kiwify.com.br/abc123?sck=u-1',
    );
  });

  it('keeps query parameters the link already had', () => {
    expect(checkoutUrl(`${base}?afid=parceiro`, { userId: 'u-1' })).toBe(
      'https://pay.kiwify.com.br/abc123?afid=parceiro&sck=u-1',
    );
  });

  it('pre-fills the address when we know it, so the two match by default', () => {
    expect(checkoutUrl(base, { userId: 'u-1', email: 'alguem@exemplo.com' })).toBe(
      'https://pay.kiwify.com.br/abc123?sck=u-1&email=alguem%40exemplo.com',
    );
  });

  /**
   * The guard that would have caught the original bug. `ww_uid` passed every
   * test above while being silently discarded by Kiwify, because the tests
   * only ever asserted our own spelling back at us.
   */
  it('only uses parameter names Kiwify keeps', () => {
    const KIWIFY_KEEPS = new Set([
      'src',
      'sck',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      's1',
      's2',
      's3',
      // Prefill fields, documented separately from the tracking ones.
      'name',
      'email',
      'phone',
      'cpf',
      'region',
    ]);

    const link = checkoutUrl(base, { userId: 'u-1', email: 'alguem@exemplo.com' });
    const added = [...new URL(link!).searchParams.keys()];

    expect(added.length).toBeGreaterThan(0);
    expect(added.filter((key) => !KIWIFY_KEEPS.has(key))).toEqual([]);
  });

  it('leaves the link alone for someone who is not signed in', () => {
    expect(checkoutUrl(base, {})).toBe(base);
    expect(checkoutUrl(base, { userId: undefined })).toBe(base);
  });

  /**
   * The base comes from an environment variable, so a typo is a link on a
   * page Kauã sells from. Anything that is not an https URL is refused rather
   * than rendered — a `javascript:` or a stranger's host would otherwise ship.
   */
  it('refuses anything that is not an https URL', () => {
    expect(checkoutUrl('javascript:alert(1)', { userId: 'u-1' })).toBeNull();
    expect(checkoutUrl('http://pay.kiwify.com.br/abc', { userId: 'u-1' })).toBeNull();
    expect(checkoutUrl('nao-e-url', { userId: 'u-1' })).toBeNull();
    expect(checkoutUrl('', { userId: 'u-1' })).toBeNull();
    expect(checkoutUrl(undefined, { userId: 'u-1' })).toBeNull();
  });
});

describe('nextMeeting', () => {
  // Thursday 20:00 in São Paulo is 23:00 UTC, all year: Brazil has no DST.
  const at = (iso: string) => nextMeeting(new Date(iso));

  it('finds this Thursday from earlier in the week', () => {
    // Monday 2026-09-07 -> Thursday 2026-09-10
    expect(at('2026-09-07T12:00:00Z').toISOString()).toBe('2026-09-10T23:00:00.000Z');
  });

  it('still points at tonight while the meeting is running', () => {
    expect(at('2026-09-10T23:40:00Z').toISOString()).toBe('2026-09-10T23:00:00.000Z');
  });

  it('rolls to next week once it is over', () => {
    expect(at('2026-09-11T02:00:00Z').toISOString()).toBe('2026-09-17T23:00:00.000Z');
  });

  it('crosses the end of a month without losing its footing', () => {
    // Friday 2026-09-25 -> Thursday 2026-10-01
    expect(at('2026-09-25T12:00:00Z').toISOString()).toBe('2026-10-01T23:00:00.000Z');
  });

  it('crosses the end of a year too', () => {
    // Friday 2026-12-25 -> Thursday 2026-12-31
    expect(at('2026-12-25T12:00:00Z').toISOString()).toBe('2026-12-31T23:00:00.000Z');
    // Friday 2027-01-01 -> Thursday 2027-01-07
    expect(at('2027-01-01T12:00:00Z').toISOString()).toBe('2027-01-07T23:00:00.000Z');
  });
});

/**
 * Quem vê o encontro e quem vê o preço.
 *
 * Esta decisão morava solta dentro de `/circle`, sem teste, e é a que decide
 * se um assinante em dia leva na cara uma página tentando vender o que ele já
 * paga — ou pior, se alguém sem assinatura enxerga o link da sala.
 *
 * O RLS já devolve só linhas de quem tem direito; isto é o segundo filtro,
 * sobre a data, e ele fecha por padrão: qualquer forma estranha vira "não
 * tem".
 */
describe('holdsCircle', () => {
  const future = new Date(Date.now() + 864e5).toISOString();
  const past = new Date(Date.now() - 864e5).toISOString();

  it('abre para quem está em dia', () => {
    expect(holdsCircle([{ expires_at: future }])).toBe(true);
  });

  it('abre para o vitalício, que é expires_at nulo', () => {
    expect(holdsCircle([{ expires_at: null }])).toBe(true);
  });

  it('fecha quando a data já passou', () => {
    expect(holdsCircle([{ expires_at: past }])).toBe(false);
  });

  it('fecha quando o RLS não devolveu nada', () => {
    expect(holdsCircle([])).toBe(false);
    expect(holdsCircle(null)).toBe(false);
    expect(holdsCircle(undefined)).toBe(false);
  });

  /**
   * O caso do cancelamento: a Kiwify manda `subscription_canceled` e nós
   * gravamos a linha com a data já paga. A pessoa continua entrando até lá.
   */
  it('mantém aberto depois de cancelar, até a data já paga', () => {
    expect(holdsCircle([{ expires_at: future }])).toBe(true);
  });

  it('basta uma linha viva entre várias mortas', () => {
    expect(holdsCircle([{ expires_at: past }, { expires_at: future }])).toBe(true);
  });

  it('fecha se a data for ilegível, em vez de confiar', () => {
    expect(holdsCircle([{ expires_at: 'nao-e-data' }])).toBe(false);
  });
});
