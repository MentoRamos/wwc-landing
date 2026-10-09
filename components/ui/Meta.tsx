/**
 * The dotted line under a thing: kind, duration, valid until.
 *
 * It takes the parts and joins them, rather than taking a string with the
 * separators already in it, because half the callers had a value that is
 * sometimes null — and a hand-joined string is how you end up with a stray
 * "PDF · · 2026" on the one row where the duration is missing.
 */
export function Meta({
  parts,
  className = '',
}: {
  parts: Array<string | null | undefined | false>;
  className?: string;
}) {
  const kept = parts.filter((part): part is string => Boolean(part));
  if (kept.length === 0) return null;

  return <p className={`meta ${className}`}>{kept.join(' · ')}</p>;
}
