import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A migration da automação do evento, lida como texto.
 *
 * O que ela promete de verdade (anon não lê nada, membro não lê nada, admin
 * lê, só o service role escreve, reentrega não duplica) é provado contra o
 * Postgres em `tests/evento-db.test.ts`, que precisa de `supabase start`.
 * Este arquivo roda sem nada instalado e pega o erro mais barato: a tabela
 * nova que nasceu sem RLS, com grant para anon, ou a função que qualquer um
 * pode chamar.
 */
const DIR = join(process.cwd(), 'supabase/migrations');
const FILE = readdirSync(DIR).find((name) => name.endsWith('_evento_automacao.sql'));
const sql = () => readFileSync(join(DIR, FILE ?? 'ausente'), 'utf8');

const TABLES = ['event_buyers', 'message_jobs', 'contact_optouts', 'survey_responses', 'protocol_applications'];
const FUNCTIONS = ['claim_wa_jobs', 'evento_register_buyer', 'evento_cancel_buyer', 'evento_mark_purchase'];

describe('a migration da automação do evento', () => {
  it('existe e vem depois da última migration que já está em produção', () => {
    expect(FILE).toBeDefined();
    expect(FILE! > '20260917160000').toBe(true);
  });

  it('cria as cinco tabelas do design', () => {
    for (const table of TABLES) {
      expect(sql()).toMatch(new RegExp(`create table public\\.${table}\\s*\\(`));
    }
  });

  it('liga RLS em todas', () => {
    for (const table of TABLES) {
      expect(sql()).toMatch(new RegExp(`alter table public\\.${table}\\s+enable row level security`));
    }
  });

  it('dá leitura só ao admin, e a nenhuma outra política', () => {
    const policies = [...sql().matchAll(/create policy (\w+) on public\.(\w+)\s+for (\w+) to (\w+)\s+using \(([^;]*)\);/g)];
    const onNew = policies.filter((match) => TABLES.includes(match[2]));
    expect(onNew.map((match) => match[2]).sort()).toEqual([...TABLES].sort());
    for (const match of onNew) {
      expect(match[3]).toBe('select');
      expect(match[4]).toBe('authenticated');
      expect(match[5].trim()).toBe('public.is_admin()');
    }
  });

  /**
   * No molde de `interest`: tira TUDO de anon e de authenticated (o default
   * do Supabase dá truncate, references e trigger também, que um `revoke
   * insert, update, delete` deixava para trás) e devolve só o select, que a
   * política restringe ao admin.
   */
  it('tira tudo de anon e de authenticated e devolve só o select', () => {
    const source = sql();
    expect(source).not.toMatch(/grant[^;]*to\s+anon/i);
    const revoke = /revoke all on ([^;]*?)\s+from anon, authenticated;/.exec(source);
    expect(revoke).not.toBeNull();
    for (const table of TABLES) expect(revoke![1]).toMatch(new RegExp(`public\\.${table}\\b`));
    const grant = /grant select on ([^;]*?)\s+to authenticated;/.exec(source);
    for (const table of TABLES) expect(grant![1]).toMatch(new RegExp(`public\\.${table}\\b`));
    expect(source.indexOf(revoke![0])).toBeLessThan(source.indexOf(grant![0]));
    expect(source).not.toMatch(/grant (?:all|insert|update|delete)[^;]*to authenticated/i);
  });

  it('mantém o service role com tudo nas cinco tabelas', () => {
    const grant = /grant all on ([^;]*?)\s+to service_role;/.exec(sql());
    for (const table of TABLES) expect(grant![1]).toMatch(new RegExp(`public\\.${table}\\b`));
  });

  it('deixa as funções só para o service role', () => {
    for (const fn of FUNCTIONS) {
      expect(sql()).toMatch(new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\)\\s+from public, anon, authenticated;`));
      expect(sql()).toMatch(new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\)\\s+to service_role;`));
    }
  });

  it('guarda a idempotência no banco, não no código', () => {
    const source = sql();
    expect(source).toMatch(/unique \(edition_id, order_id\)/);
    expect(source).toMatch(/unique \(buyer_id, channel, step_key\)/);
    expect(source).toMatch(/unique \(channel, address, scope\)/);
  });

  it('cria o bucket privado da Ficha, só PDF', () => {
    expect(sql()).toMatch(/insert into storage\.buckets[\s\S]*'evento',\s*'evento',\s*false/);
    expect(sql()).toContain("array['application/pdf']");
  });

  it('registra a edição que o código procura pelo slug', () => {
    expect(sql()).toContain("'imersao-2026-10'");
  });
});
