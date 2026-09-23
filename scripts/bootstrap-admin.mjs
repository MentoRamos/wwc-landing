/**
 * Makes one existing account an admin.
 *
 * `admin_users` is unreadable and unwritable by everyone — its only policy is
 * `using (false)` — so membership can only ever be granted with the service
 * role. That is the point: there is no path from "signed in" to "admin" that
 * runs through the application.
 *
 * The address is an argument and never a committed constant. A student's email
 * in a versioned file is PII in git history, which is not removable.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<secret key from Dashboard > Settings > API Keys> \
 *   node scripts/bootstrap-admin.mjs alguem@exemplo.com
 *
 * The person must have signed in at least once: an admin is an account, not an
 * address, so there has to be a row in auth.users to point at.
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) {
  console.error('Uso: node scripts/bootstrap-admin.mjs <email>');
  process.exit(2);
}
if (!url || !key) {
  console.error('Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(2);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

// listUsers pages; the platform is small enough that walking it is simpler and
// more honest than a filter the API does not actually promise to support.
let user;
for (let page = 1; page <= 20 && !user; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error(`Não consegui listar as contas: ${error.message}`);
    process.exit(1);
  }
  if (data.users.length === 0) break;
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
}

if (!user) {
  console.error(
    `Nenhuma conta com esse endereço. A pessoa precisa entrar uma vez antes — ` +
      `admin é uma conta, não um e-mail.`,
  );
  process.exit(1);
}

const { error } = await admin
  .from('admin_users')
  .upsert({ user_id: user.id }, { onConflict: 'user_id' });

if (error) {
  console.error(`O banco recusou: ${error.message}`);
  process.exit(1);
}

// Deliberately prints the id, not the address: this output ends up in
// terminals, screenshots and scrollback.
console.log(`ok — conta ${user.id} agora é admin.`);
