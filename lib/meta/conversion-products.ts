/**
 * The Kiwify products that are sales to measure, not access to grant.
 *
 * These never go through `KIWIFY_PRODUCTS`: the ticket and the Protocol do not
 * unlock anything on the platform (the ticket buyer joins a WhatsApp group,
 * the Protocol student is onboarded by hand). What the webhook owes them is a
 * server-side Purchase in Meta, because the browser pixel only fires for the
 * buyers who accepted cookies.
 *
 * `value` is the list price in BRL. Kiwify's payload does carry amounts
 * (`Commissions.charge_amount`), but no captured event has ever proved their
 * unit, and a value off by a factor of 100 would poison the ad account's
 * ROAS for good. The list price is the honest floor until a real payload
 * pins that down.
 */
export type ConversionProduct = {
  name: string;
  value: number;
  sourceUrl: string;
};

const IMERSAO_URL = 'https://kauaramos.com/imersao';
const PROTOCOLO_URL = 'https://kauaramos.com/imersao/protocolo';

export const CONVERSION_PRODUCTS: Readonly<Record<string, ConversionProduct>> = {
  'ac3fc1c0-b78c-11f1-8ef9-6f8516a1cddf': {
    name: 'Imersão Performance e Longevidade',
    value: 97,
    sourceUrl: IMERSAO_URL,
  },
  'a0361350-b793-11f1-a02f-752fbbcb4576': {
    name: 'W&W Protocol 180 dias',
    value: 12600,
    sourceUrl: PROTOCOLO_URL,
  },
  '496896f0-b794-11f1-b594-75596ac4e822': {
    name: 'W&W Protocol 90 dias',
    value: 6900,
    sourceUrl: PROTOCOLO_URL,
  },
};

export function conversionProductFor(externalId: string): ConversionProduct | undefined {
  return Object.hasOwn(CONVERSION_PRODUCTS, externalId) ? CONVERSION_PRODUCTS[externalId] : undefined;
}
