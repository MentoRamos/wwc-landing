import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentMask } from './helpers/source';

/**
 * O pós-compra da imersão dentro do webhook da Kiwify. Lido como texto, como
 * o resto da suíte da rota: ela fala com Postgres, Resend e Meta, e o que
 * importa aqui é ordem, que o código mostra. O efeito no banco é provado em
 * `tests/evento-db.test.ts` (Postgres de verdade).
 */
const ROUTE = join(process.cwd(), 'app/api/webhooks/kiwify/route.ts');

function code(): string {
  const source = readFileSync(ROUTE, 'utf8');
  const mask = commentMask(source);
  return [...source].map((char, i) => (mask[i] ? ' ' : char)).join('');
}

describe('a trava do webhook', () => {
  /**
   * Com a chave antiga (`event.id`, que é o `order_id`), o reembolso do mesmo
   * pedido colidia com a aprovação e era descartado como duplicata.
   */
  it('usa lockKey para gravar e para marcar o evento processado', () => {
    const source = code();
    expect(source).toMatch(/external_event_id: lockKey\(event\)|external_event_id: key\b/);
    expect(source).not.toMatch(/\.eq\('external_event_id', event\.id\)/);
  });

  it('continua descartando a duplicata exata pelo 23505', () => {
    expect(code()).toContain("claimError.code === '23505'");
  });
});

describe('o lado do evento', () => {
  it('só roda depois de ganhar a trava', () => {
    const source = code();
    expect(source.indexOf('applyEventoEvent(')).toBeGreaterThan(source.indexOf(".from('billing_events').insert("));
  });

  /**
   * A gravação e a reserva do Protocol não são produtos da plataforma. Se
   * caíssem em `interpret`, toda venda delas terminaria em "produto fora da
   * plataforma" e no alerta de pagamento que não virou acesso.
   */
  it('desvia os produtos do evento antes do caminho de acesso', () => {
    const source = code();
    expect(source.indexOf('eventoProductKind(')).toBeGreaterThan(-1);
    expect(source.indexOf('eventoProductKind(')).toBeLessThan(source.indexOf('interpret({'));
    expect(source.indexOf('applyEventoEvent(')).toBeLessThan(source.indexOf('interpret({'));
  });

  it('manda a T0 depois de responder, pelo after() do Next', () => {
    const source = code();
    expect(source).toMatch(/import \{[^}]*\bafter\b[^}]*\} from 'next\/server'/);
    expect(source).toMatch(/after\(async \(\) => \{[\s\S]*?sendT0Email\(/);
  });

  it('mantém a Purchase da CAPI no mesmo ramo, antes do evento', () => {
    const source = code();
    expect(source.indexOf('buildPurchase(')).toBeGreaterThan(-1);
    expect(source.indexOf('buildPurchase(')).toBeLessThan(source.indexOf('applyEventoEvent('));
  });

  it('loga o evento só com id, tipo e resultado', () => {
    const source = code();
    expect(source).toMatch(/console\.info\('\[kiwify\] evento', \{ event: event\.id, type: event\.type, result: [\w.]+ \}\)/);
    for (const call of source.match(/console\.\w+\([^;]*\);/g) ?? []) {
      const args = call.replace(/'[^']*'/g, "''");
      expect(args).not.toMatch(/\b(contact|email|phone|first_name|alert)\b/);
    }
  });
});
