/**
 * A cota diária do Resend, decidida sem rede.
 *
 * A régua do Circle tinha o próprio teto (90), o evento teria outro, e os
 * alertas nenhum. Somados, passavam dos 100/dia do plano grátis, e quando a
 * cota estoura o Resend recusa tudo, inclusive o alerta de "paguei e o acesso
 * não entrou". Aqui é uma conta só: `RESEND_DAILY_BUDGET` (100 no grátis,
 * 1500 no Pro), com os últimos 10 do dia reservados para alerta.
 *
 * A janela é das últimas 24h, e não do dia civil, porque o Resend não diz em
 * que fuso a cota vira; a janela móvel fica abaixo do teto nas duas leituras.
 */
export const DEFAULT_DAILY_BUDGET = 100;
export const ALERT_RESERVE = 10;

export function readDailyBudget(raw: string | undefined): number {
  const value = Number.parseInt(raw?.trim() ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_BUDGET;
}

export function budgetAllows(input: { sentLast24h: number; budget: number; isAlert?: boolean }): boolean {
  const ceiling = input.isAlert ? input.budget : input.budget - ALERT_RESERVE;
  return input.sentLast24h < ceiling;
}
