import { describe, expect, it } from 'vitest';
import { budgetAllows, readDailyBudget } from '@/lib/core/email-budget.core';

/**
 * A cota do Resend é uma só para a régua do Circle, o evento e os alertas.
 * Cada um com o seu teto local somava mais que os 100/dia do plano grátis, e
 * o que caía primeiro era justamente o alerta de pagamento que não virou
 * acesso. Por isso os 10 últimos envios do dia ficam para alerta.
 */
describe('a cota compartilhada do Resend', () => {
  it('usa 100 quando a variável não existe ou não é número', () => {
    expect(readDailyBudget(undefined)).toBe(100);
    expect(readDailyBudget('')).toBe(100);
    expect(readDailyBudget('muitos')).toBe(100);
    expect(readDailyBudget('0')).toBe(100);
    expect(readDailyBudget(' 1500 ')).toBe(1500);
  });

  it('deixa o evento enviar até a reserva dos alertas', () => {
    expect(budgetAllows({ sentLast24h: 0, budget: 100 })).toBe(true);
    expect(budgetAllows({ sentLast24h: 89, budget: 100 })).toBe(true);
    expect(budgetAllows({ sentLast24h: 90, budget: 100 })).toBe(false);
  });

  it('com 95 enviados no dia, só alerta passa', () => {
    expect(budgetAllows({ sentLast24h: 95, budget: 100 })).toBe(false);
    expect(budgetAllows({ sentLast24h: 95, budget: 100, isAlert: true })).toBe(true);
    expect(budgetAllows({ sentLast24h: 100, budget: 100, isAlert: true })).toBe(false);
  });

  it('com o plano pago a reserva continua 10', () => {
    expect(budgetAllows({ sentLast24h: 1489, budget: 1500 })).toBe(true);
    expect(budgetAllows({ sentLast24h: 1490, budget: 1500 })).toBe(false);
  });
});
