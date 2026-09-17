/**
 * The parsing and arithmetic behind granting access, with no database and no
 * request in sight.
 *
 * Everything here is about one failure that leaves no trace: a grant that is
 * written successfully against an address nothing will ever match. The person
 * signs in, sees an empty page, and no log anywhere says why — so the rules
 * that shape an address and an expiry date are pinned by tests instead of
 * being retyped in each route that needs them.
 */

/** Mirrors `public.product_key`. Order is the order the UI offers them in. */
export const PRODUCTS = ['protocol', 'circle', 'connect', 'face_a_face'] as const;
export type Product = (typeof PRODUCTS)[number];

export type GrantEntry = { email: string; product: Product | undefined };
export type GrantError = { line: number; raw: string; reason: string };

/**
 * The exact counterpart of `public.norm_email`, which is `lower(btrim(value))`.
 *
 * Deliberately not "clever": no stripping of dots, no cutting at `+`. Those
 * are Gmail conventions, not email ones, and applying them here would make
 * this disagree with the column's own check constraint.
 */
export function normEmail(value: string): string {
  return value.trim().toLowerCase();
}

// Good enough to catch a pasted name or a stray column, which is all this is
// for. The address is proved by someone signing in with it, never by a regex.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isProduct = (value: string): value is Product =>
  (PRODUCTS as readonly string[]).includes(value);

/**
 * Reads what a person pasted: one address per line, optionally followed by a
 * product after a comma, semicolon or tab.
 *
 * A line that cannot be read comes back in `errors` rather than being dropped.
 * Silently skipping a line is how someone pays and never gets access — the
 * paste looked like it worked, and nobody finds out until they complain.
 */
export function parseGrantList(raw: string): { entries: GrantEntry[]; errors: GrantError[] } {
  const entries: GrantEntry[] = [];
  const errors: GrantError[] = [];
  const seen = new Set<string>();

  raw.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;

    const [emailPart, productPart] = line.split(/[,;\t]/, 2).map((part) => part?.trim() ?? '');

    // A header row pasted along with the data. Only skipped in the first
    // column, so a person genuinely named "email" in a note is unaffected.
    if (emailPart.toLowerCase() === 'email') return;

    const email = normEmail(emailPart);
    if (!LOOKS_LIKE_EMAIL.test(email)) {
      errors.push({ line: index + 1, raw: line, reason: 'endereço inválido' });
      return;
    }

    let product: Product | undefined;
    if (productPart) {
      const candidate = productPart.toLowerCase();
      if (!isProduct(candidate)) {
        errors.push({ line: index + 1, raw: line, reason: 'produto desconhecido' });
        return;
      }
      product = candidate;
    }

    // The first spelling of an address wins. Granting twice in one paste would
    // write two rows that both answer, and revoking one would look like a bug.
    if (seen.has(email)) return;
    seen.add(email);
    entries.push({ email, product });
  });

  return { entries, errors };
}

const DAYS: Record<string, number> = { '30d': 30, '90d': 90, '365d': 365 };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turns a choice from the form into the value `entitlements.expires_at` holds.
 *
 * `null` is lifetime and nothing else means it — a Protocol student and a
 * Connect guest keep their access with no row to sweep and no cron to die.
 * An explicit date ends at the close of that day, because a person who types
 * 31/12 means the 31st is still theirs.
 */
export function expiryFrom(choice: string, now: Date): Date | null {
  if (choice === 'lifetime') return null;

  const days = DAYS[choice];
  if (days) return new Date(now.getTime() + days * 86_400_000);

  if (ISO_DATE.test(choice)) {
    const end = new Date(`${choice}T23:59:59.999Z`);
    if (Number.isNaN(end.getTime())) throw new Error('Data inválida.');
    if (end <= now) throw new Error('Essa data está no passado; o acesso nasceria morto.');
    return end;
  }

  throw new Error('Prazo inválido.');
}
