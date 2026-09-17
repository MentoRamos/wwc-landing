import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { walk } from './helpers/source';

/**
 * Toda tabela do `public` precisa de privilégio explícito para `service_role`.
 *
 * Este defeito já aconteceu duas vezes neste repo, e a segunda foi minha.
 *
 * A primeira foi corrigida em `20260911120000_service_role_grants.sql`, cujo
 * próprio comentário diz a parte que importa: **localmente isso é invisível**.
 * Um projeto Supabase local concede tudo por padrão, então o servidor funciona
 * na sua máquina, passa nos testes, sobe, e só em produção o service role
 * descobre que não pode escrever. Pior: uma escrita negada não parece bug de
 * permissão, parece nada — a linha simplesmente não aparece.
 *
 * A segunda foi esta. A correção de 11/09 era uma LISTA ESCRITA À MÃO de doze
 * tabelas. Quatro tabelas nasceram depois dela: `interest` lembrou de se
 * conceder, `student_documents`, `document_access_log` e `circle_emails` não.
 * Resultado em produção: a régua não reservava nada e devolvia "zero enviados"
 * como se estivesse em dia, e a rota de download do aluno recusava todo mundo
 * com 503, porque a trilha que bloqueia a entrega não conseguia ser escrita.
 *
 * Por isso a trava não pode ser outra lista. Ela anda as migrations, acha toda
 * tabela criada, e exige que alguma migration conceda à `service_role` sobre
 * ela. Uma tabela nova que esqueça o grant reprova aqui, na máquina de quem
 * escreveu, em vez de reprovar em produção daqui a três dias.
 */
const DIR = join(process.cwd(), 'supabase/migrations');

function sql(): string {
  return walk(DIR, ['.sql'])
    .sort()
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
}

function createdTables(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi)) {
    found.add(match[1]);
  }
  return [...found].sort();
}

/** Aceita o grant explícito na tabela ou um `alter default privileges` que a cubra. */
function grantedToServiceRole(source: string, table: string): boolean {
  if (/alter\s+default\s+privileges[\s\S]{0,200}?to\s+service_role/i.test(source)) return true;

  const grants = source.matchAll(/grant\s+([\s\S]*?)\s+to\s+service_role\s*;/gi);
  for (const grant of grants) {
    if (new RegExp(`\\bpublic\\.${table}\\b`).test(grant[1])) return true;
  }
  return false;
}

describe('os privilégios do service role', () => {
  it('cobrem toda tabela criada nas migrations', () => {
    const source = sql();
    const missing = createdTables(source).filter((table) => !grantedToServiceRole(source, table));

    expect(missing).toEqual([]);
  });

  /**
   * Sem isto, o teste acima passa verde num mundo em que a varredura não acha
   * migration nenhuma: lista vazia parece sucesso.
   */
  it('acham as tabelas e enxergam a falta quando ela existe', () => {
    expect(createdTables(sql()).length).toBeGreaterThan(10);

    const inventado = 'create table public.esquecida (id uuid);\ngrant all on public.outra to service_role;';
    expect(createdTables(inventado)).toEqual(['esquecida']);
    expect(grantedToServiceRole(inventado, 'esquecida')).toBe(false);
    expect(grantedToServiceRole(inventado, 'outra')).toBe(true);
  });
});
