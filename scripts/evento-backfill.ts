/**
 * Backfill dos compradores do ingresso que chegaram em `billing_events` antes
 * da automação do evento (ver `lib/evento/backfill.ts`).
 *
 *   npm run evento:backfill                  # dry-run: só contagens
 *   npm run evento:backfill -- --executar    # grava compradores e jobs
 *   npm run evento:backfill -- --desde=2026-09-23 --excluir=outro@email.com
 *
 * Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente
 * (o script nunca imprime nenhum dos dois). As compras de teste do Kauã ficam
 * de fora pelos e-mails de EVENTO_SANDBOX_ALLOWLIST mais os de --excluir.
 *
 * Gravar não envia nada: os jobs dos antigos só saem pelo tick, e só com
 * EVENTO_ANTIGOS_LIBERADO=true (OK do Kauã).
 */
import { adminClient } from '@/lib/supabase/admin';
import { eventoConfig } from '@/lib/evento/config';
import { runBackfill } from '@/lib/evento/backfill';

const KNOWN = new Set(['--executar', '--desde', '--excluir']);
const args = process.argv.slice(2).filter((arg) => arg !== '--');

// Flag que ninguém lê é recusada: um `--executra` digitado errado rodaria em
// dry-run achando que gravou, e o contrário seria pior.
for (const arg of args) {
  if (!KNOWN.has(arg.split('=')[0])) {
    console.error(`Flag desconhecida: ${arg}`);
    process.exit(2);
  }
}

const value = (name: string) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const dryRun = !args.includes('--executar');
const sinceRaw = value('--desde') ?? '2026-09-23';
const since = new Date(`${sinceRaw}T00:00:00-03:00`);
if (Number.isNaN(since.getTime())) {
  console.error(`--desde inválido: ${sinceRaw} (use AAAA-MM-DD)`);
  process.exit(2);
}
const extra = (value('--excluir') ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const excludeEmails = [...eventoConfig().sandboxAllowlist, ...extra];

if (excludeEmails.length === 0) {
  // Sem ninguém para excluir, as compras de teste do Kauã entrariam como
  // compradores de verdade.
  console.error('Nenhum e-mail para excluir: defina EVENTO_SANDBOX_ALLOWLIST ou passe --excluir.');
  process.exit(2);
}

const summary = await runBackfill(adminClient(), { since, now: new Date(), dryRun, excludeEmails });
console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'executado', since: since.toISOString(), excluded_emails: excludeEmails.length, ...summary }, null, 2));
