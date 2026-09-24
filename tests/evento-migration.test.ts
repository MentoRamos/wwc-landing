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
const FUNCTIONS = [
  'claim_wa_jobs',
  'evento_register_buyer',
  'evento_cancel_buyer',
  'evento_mark_purchase',
  'evento_wa_result',
  'evento_wa_optout',
];

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

  /** O corpo de uma função, do `create` até o `$$;` que a fecha. */
  const fnBody = (name: string) => {
    const match = new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`).exec(sql());
    expect(match, name).not.toBeNull();
    return match![0];
  };

  /**
   * Só o service role chama estas funções, e ele já passa por cima do RLS e
   * tem grant nas tabelas: `security definer` não daria nada, só alargaria o
   * que um grant errado no futuro abriria. E o `search_path` fixo termina em
   * `pg_temp`, para um objeto temporário nunca sombrear um de `public`.
   */
  it('nenhuma função é security definer, e todas fixam search_path com pg_temp no fim', () => {
    for (const fn of FUNCTIONS) {
      const body = fnBody(fn);
      expect(body, fn).not.toMatch(/security definer/i);
      expect(body, fn).toMatch(/set search_path = public, pg_temp\n/);
    }
  });

  /**
   * Entre o `select` por order_id e o insert da lápide, a aprovação do mesmo
   * pedido pode ter inserido o comprador. Sem `on conflict`, o reembolso
   * morria em 23505 e o comprador seguia pago recebendo mensagem de venda.
   */
  it('a lápide não quebra quando a aprovação do mesmo pedido entrou no meio', () => {
    const body = fnBody('evento_cancel_buyer');
    const tombstone = /insert into public\.event_buyers[\s\S]*?;/.exec(body)![0];
    expect(tombstone).toMatch(/on conflict \(edition_id, order_id\) do nothing/);
    // Se não inseriu, segue pelo caminho do order_id (marca e cancela).
    const after = body.slice(body.indexOf(tombstone) + tombstone.length);
    expect(after).toMatch(/where b\.edition_id = v_edition and b\.order_id = p_order_id/);
    expect(after).toMatch(/v_matched := 'order_id'/);
  });

  /**
   * No WhatsApp não há chave de idempotência: um job cujo lease venceu pode
   * ter saído. Ele vira `unknown` (decisão humana) e nunca volta a
   * `pending`, senão a pessoa recebe a mesma mensagem duas vezes.
   */
  it('o claim do WhatsApp manda lease vencido para unknown, nunca de volta para pending', () => {
    const body = fnBody('claim_wa_jobs');
    expect(body).toMatch(/set status = 'unknown'[^;]*where[^;]*status = 'claimed'[^;]*lease_until < p_now/);
    expect(body).not.toMatch(/set status = 'pending'/);
  });

  /** Em dry-run o worker não reporta: um lease criado ali viraria `unknown`. */
  it('o claim em dry-run não reserva nem muda nada', () => {
    const body = fnBody('claim_wa_jobs');
    const dry = body.indexOf('if p_dry_run then');
    expect(dry).toBeGreaterThan(-1);
    const firstWrite = body.search(/\bupdate public\.message_jobs\b/);
    expect(body.slice(0, firstWrite)).toMatch(/if not p_dry_run then/);
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

/**
 * O rollback mora fora de `supabase/migrations/` de propósito: o CLI aplica
 * tudo que está lá, e um `.down.sql` ali seria executado no próximo
 * `db push`, apagando as tabelas logo depois de criá-las.
 */
describe('o rollback da migration do evento', () => {
  const ROLLBACK = join(process.cwd(), 'supabase/rollback/20260925120000_evento_automacao.down.sql');
  const down = () => readFileSync(ROLLBACK, 'utf8');

  it('existe fora da pasta de migrations', () => {
    expect(readdirSync(DIR).some((name) => name.includes('.down.'))).toBe(false);
    expect(() => down()).not.toThrow();
  });

  it('desfaz as cinco tabelas e as seis funções, numa transação', () => {
    const source = down();
    for (const table of TABLES) expect(source).toMatch(new RegExp(`drop table if exists public\\.${table}\\b`));
    for (const fn of FUNCTIONS) expect(source).toMatch(new RegExp(`drop function if exists public\\.${fn}\\(`));
    expect(source).toMatch(/^begin;/m);
    expect(source).toMatch(/^commit;/m);
  });

  it('só apaga o bucket e a edição quando nada depende deles', () => {
    const source = down();
    expect(source).toMatch(/delete from storage\.buckets[\s\S]*?not exists \(select 1 from storage\.objects/);
    expect(source).toMatch(/delete from public\.event_editions[\s\S]*?not exists \(select 1 from public\.event_rsvps/);
  });
});
