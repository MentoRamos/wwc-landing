/**
 * O estado inicial dos formulários de admin, fora de qualquer `'use server'`.
 *
 * Isto morava dentro dos próprios arquivos de action, e era um defeito que
 * derrubava toda a administração em produção. Um módulo `'use server'` só pode
 * exportar função async: o Next valida isso ao carregar o módulo e lança E352,
 * "A 'use server' file can only export async functions, found object".
 *
 * O jeito como falha é o que tornou isso tão difícil de achar. O erro é do
 * CARREGAMENTO do módulo, não da ação, então a ação nunca chega a rodar:
 * nenhum try/catch dentro dela pega, nada aparece no log da aplicação, e a
 * tela mostra só o error boundary com um digest. Parece bug da ação, e não é.
 *
 * `export type` continua permitido nos arquivos de action, porque tipo não
 * existe depois da compilação. O que não pode atravessar a fronteira é valor.
 */
export type ActionState = { ok: boolean; message: string; details?: string[] };

export const INITIAL_STATE: ActionState = { ok: false, message: '' };
