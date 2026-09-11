import type { Product } from '@/lib/core/admin.core';
import type { SignatureAlgorithm } from '@/lib/core/kiwify.core';

/**
 * Everything about Kiwify that we had to guess, kept in the environment so
 * that pinning it down later is a deploy and not a release.
 *
 * Kiwify documents the event names and a `token`, but not which algorithm
 * signs the body nor where the signature travels. The moment a real test event
 * is captured, these three variables record the answer.
 */
export function webhookSecret(): string {
  return process.env.KIWIFY_WEBHOOK_TOKEN?.trim() ?? '';
}

/** `sha1` is Kiwify's apparent default; `sha256` is one variable away. */
export function signatureAlgorithm(): SignatureAlgorithm {
  return process.env.KIWIFY_SIGNATURE_ALGORITHM?.trim() === 'sha256' ? 'sha256' : 'sha1';
}

/**
 * Where the signature arrives: `query:signature` or `header:x-kiwify-signature`.
 * Defaults to the query string, which is what Kiwify's panel appears to send.
 */
export function readSignature(request: Request): string | null {
  const spec = process.env.KIWIFY_SIGNATURE_SOURCE?.trim() || 'query:signature';
  const [where, name] = spec.split(':', 2);

  if (where === 'header') return request.headers.get(name ?? '');
  return new URL(request.url).searchParams.get(name ?? 'signature');
}

/**
 * Which Kiwify product is which of ours, as JSON:
 *
 *   KIWIFY_PRODUCTS='{"abc123":"circle","def456":"circle"}'
 *
 * An id that is not listed is not ours — Kauã may sell something else on the
 * same account one day, and an unmapped product must be ignored rather than
 * quietly granted the Library.
 */
export function productFor(externalId: string): Product | undefined {
  const raw = process.env.KIWIFY_PRODUCTS?.trim();
  if (!raw) return undefined;

  try {
    const map = JSON.parse(raw) as Record<string, Product>;
    return map[externalId];
  } catch {
    // A malformed map must not become "everything matches".
    console.error('[kiwify] KIWIFY_PRODUCTS não é um JSON válido');
    return undefined;
  }
}
