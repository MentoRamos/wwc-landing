import { describe, it, expect } from 'vitest';
import { serviceClient, signedInAs, userIdFor, uniqueEmail, anonClient } from './helpers/local-supabase';

/**
 * Apagar a conta, provado contra o Postgres de verdade.
 *
 * A LGPD dá ao titular o direito de sumir, e até aqui a plataforma respondia
 * "escreva para o e-mail" — o que atende a lei e não atende a pessoa. O risco
 * de automatizar isso é apagar o que não era dela: uma cláusula errada num
 * `delete` não dá erro, ela apaga a mais. Por isso cada teste tem um segundo
 * titular intocado ao lado.
 */
const admin = serviceClient();

async function seedPessoa(email: string) {
  const client = await signedInAs(email);
  const id = await userIdFor(email);

  const { data: doc, error: docError } = await admin
    .from('student_documents')
    .insert({
      user_id: id,
      email_norm: email.toLowerCase(),
      email_raw: email,
      kind: 'weekly_report',
      title: 'Semana 1',
      issued_at: '2026-09-14',
      storage_path: `weekly_report/2026-09-14/${id}.pdf`,
    })
    .select('id')
    .single();
  if (docError) throw docError;

  const { error: entError } = await admin.from('entitlements').insert({
    email_norm: email.toLowerCase(),
    email_raw: email,
    product: 'circle',
    source: 'manual',
    user_id: id,
  });
  if (entError) throw entError;

  const { data: item, error: itemError } = await admin
    .from('content_items')
    .insert({
      slug: `replay-apagar-${id}`,
      kind: 'video',
      collection: 'replays',
      title: 'Encontro de teste',
      youtube_id: 'TESTE',
      required_products: ['circle'],
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (itemError) throw itemError;

  const { error: progressError } = await admin
    .from('progress')
    .insert({ user_id: id, content_item_id: item.id, position_seconds: 10 });
  if (progressError) throw progressError;

  const { error: interestError } = await admin
    .from('interest')
    .insert({ email_norm: email.toLowerCase(), product: 'circle', source: 'circle' });
  if (interestError) throw interestError;

  return { client, id, docId: doc.id as string };
}

async function contar(table: string, column: string, value: string): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value);
  if (error) throw error;
  return count ?? 0;
}

describe('delete_own_account', () => {
  it('apaga o titular inteiro e não encosta em quem está ao lado', async () => {
    const emailA = uniqueEmail('apaga');
    const emailB = uniqueEmail('fica');
    const a = await seedPessoa(emailA);
    const b = await seedPessoa(emailB);

    const { error } = await a.client.rpc('delete_own_account');
    expect(error).toBeNull();

    expect(await contar('student_documents', 'user_id', a.id)).toBe(0);
    expect(await contar('entitlements', 'user_id', a.id)).toBe(0);
    expect(await contar('interest', 'email_norm', emailA.toLowerCase())).toBe(0);
    expect(await contar('profiles', 'id', a.id)).toBe(0);
    expect(await contar('progress', 'user_id', a.id)).toBe(0);

    // A identidade em si: sem isto, a conta "apagada" volta inteira no
    // próximo login com o mesmo Google.
    const { data: sumiu } = await admin.auth.admin.getUserById(a.id);
    expect(sumiu.user).toBeNull();

    // O vizinho, que é a única forma de saber que o `delete` tinha cláusula.
    expect(await contar('student_documents', 'user_id', b.id)).toBe(1);
    expect(await contar('entitlements', 'user_id', b.id)).toBe(1);
    expect(await contar('interest', 'email_norm', emailB.toLowerCase())).toBe(1);
    expect(await contar('profiles', 'id', b.id)).toBe(1);
    expect(await contar('progress', 'user_id', b.id)).toBe(1);
    const { data: continua } = await admin.auth.admin.getUserById(b.id);
    expect(continua.user?.id).toBe(b.id);
  }, 60_000);

  it('devolve o que apagou, para a tela poder dizer o que aconteceu', async () => {
    const email = uniqueEmail('resumo');
    const pessoa = await seedPessoa(email);

    const { data, error } = await pessoa.client.rpc('delete_own_account');
    expect(error).toBeNull();
    expect(data).toMatchObject({ student_documents: 1, entitlements: 1, interest: 1, progress: 1 });
  }, 60_000);

  it('recusa quem não está autenticado, em vez de apagar algo por engano', async () => {
    const { error } = await anonClient().rpc('delete_own_account');
    expect(error).not.toBeNull();
  });

  /**
   * O Kauã é o único admin. Se ele apagar a própria conta por curiosidade,
   * `admin_users` fica vazia, `is_admin()` passa a devolver false para todo
   * mundo e não existe mais caminho para conceder acesso a ninguém — sem erro
   * nenhum, só uma plataforma que não administra mais.
   */
  it('recusa apagar a conta de administrador', async () => {
    const email = uniqueEmail('admin');
    const pessoa = await seedPessoa(email);
    const { error: grantError } = await admin.from('admin_users').insert({ user_id: pessoa.id });
    if (grantError) throw grantError;

    const { error } = await pessoa.client.rpc('delete_own_account');
    expect(error).not.toBeNull();
    expect(await contar('profiles', 'id', pessoa.id)).toBe(1);
  }, 60_000);
});
