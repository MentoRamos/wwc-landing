/**
 * Reading a "me avisa quando abrir" out of a form post.
 *
 * This is the quietest money on the platform. The Circle's checkout links are
 * not configured yet, so `/circle` tells the one person who wants to pay that
 * subscriptions "abrem em breve" and then asks them for nothing — and the
 * event page's own form was posting a payload the live handler rejects with a
 * 400. Both places where somebody raises their hand were dropping it.
 *
 * The shape of the rules follows from that: the email is the only thing worth
 * refusing a lead over. A malformed phone number loses the phone, not the
 * person.
 */

export const PRODUCTS = ['circle', 'connect', 'protocol'] as const;
export type InterestProduct = (typeof PRODUCTS)[number];

export type Interest = {
  email: string;
  product: InterestProduct;
  name?: string;
  whatsapp?: string;
  source: string;
};

/** Deliberately loose: this decides who we can reach, not who exists. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 120;

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, MAX_TEXT);
  return trimmed || undefined;
}

/**
 * A number we could actually send a message to, or nothing.
 *
 * A leading `+` means the person told us their country, so it is taken as
 * written. Without one the number is Brazilian — which matters more than it
 * looks: `11987654321` is a São Paulo mobile and also, read as international,
 * a US number. Guessing by the first digit would silently mangle every lead
 * from the largest city in the country.
 */
export function normalizeWhatsapp(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;

  const international = raw.trim().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return undefined;

  if (international) {
    return digits.length >= 10 && digits.length <= 15 ? digits : undefined;
  }
  if (digits.length === 12 || digits.length === 13) {
    return digits.startsWith('55') ? digits : undefined;
  }
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return undefined;
}

function isProduct(value: unknown): value is InterestProduct {
  return PRODUCTS.includes(value as InterestProduct);
}

/** The same normalisation the database's `norm_email` applies. */
export function normEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function readInterest(input: unknown): Interest | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;

  if (typeof body.email !== 'string') return null;
  const email = normEmail(body.email);
  if (!EMAIL.test(email) || email.length > 254) return null;

  if (!isProduct(body.product)) return null;

  return {
    email,
    product: body.product,
    name: text(body.name),
    whatsapp: normalizeWhatsapp(body.whatsapp),
    source: text(body.source) ?? 'site',
  };
}
