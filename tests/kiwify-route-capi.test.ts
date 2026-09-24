import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentMask } from './helpers/source';

/**
 * Where the Conversions API meets the Kiwify webhook. Source-scanning, like
 * the rest of the suite: the route talks to Postgres and the Graph API, and
 * the rules that matter here are about order, which the source shows.
 */
const ROUTE = join(process.cwd(), 'app/api/webhooks/kiwify/route.ts');

function code(): string {
  const source = readFileSync(ROUTE, 'utf8');
  const mask = commentMask(source);
  return [...source].map((char, i) => (mask[i] ? ' ' : char)).join('');
}

describe('Kiwify webhook and the Conversions API', () => {
  /**
   * The idempotency lock comes first for the Purchase too: a redelivered
   * approval must not count a second sale in Meta.
   */
  it('only looks at conversion products after the idempotency claim', () => {
    const source = code();
    const claim = source.indexOf(".from('billing_events').insert(");
    const conversion = source.indexOf('conversionProductFor(');
    expect(claim).toBeGreaterThan(-1);
    expect(conversion).toBeGreaterThan(claim);
  });

  /**
   * The ticket and the Protocol are not platform products. Letting them fall
   * through to `interpret` would end in "produto fora da plataforma" and, for
   * an approved order, the "Um pagamento não virou acesso" alert on every
   * sale. So they branch off before `interpret` runs.
   */
  it('branches conversion products off before the access path', () => {
    const source = code();
    expect(source.indexOf('conversionProductFor(')).toBeLessThan(source.indexOf('interpret({'));
  });

  it('records the CAPI outcome and never logs the payload', () => {
    const source = code();
    expect(source).toContain('capiResult(');
    for (const call of source.match(/console\.\w+\([^;]*\);/g) ?? []) {
      // `describe(parsed)` names keys only, and string literals are just text.
      const args = call.replace(/'[^']*'/g, "''").replace('describe(parsed)', '');
      expect(args).not.toMatch(/\b(parsed|raw|purchase|conversion|sent)\b/);
    }
  });
});
