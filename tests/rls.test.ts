import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  serviceClient,
  anonClient,
  signedInAs,
  userIdFor,
  uniqueEmail,
} from './helpers/local-supabase';

/**
 * Row level security, asserted against a real Postgres.
 *
 * These cannot be mocked: a policy that is too permissive raises no error and
 * throws no exception. It just returns a row it should not have returned, and
 * nobody notices until someone tells you. This suite is the only thing standing
 * between a wrong `using (...)` clause and a member reading paid content they
 * never bought.
 */

const admin = serviceClient();

let guideId: string;
let replayId: string;

async function seedContent() {
  const { data: guide, error: guideError } = await admin
    .from('content_items')
    .insert({
      slug: `guia-${Date.now()}`,
      kind: 'pdf',
      collection: 'guias',
      title: 'O Mínimo Inegociável',
      storage_path: 'guias/o-minimo-inegociavel.pdf',
      required_products: ['protocol', 'circle', 'connect'],
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (guideError) throw guideError;
  guideId = guide.id;

  const { data: replay, error: replayError } = await admin
    .from('content_items')
    .insert({
      slug: `replay-${Date.now()}`,
      kind: 'video',
      collection: 'replays',
      title: 'Encontro 1 — Energia e sono',
      youtube_id: 'SEGREDO_NAO_LISTADO',
      season: 'energia-e-sono',
      required_products: ['circle', 'protocol'],
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (replayError) throw replayError;
  replayId = replay.id;
}

async function grant(
  email: string,
  product: string,
  overrides: Record<string, unknown> = {}
) {
  const { error } = await admin.from('entitlements').insert({
    email_norm: email.toLowerCase().trim(),
    email_raw: email,
    product,
    source: 'manual',
    ...overrides,
  });
  if (error) throw error;
}

beforeAll(async () => {
  await seedContent();
}, 60_000);

/**
 * A suite that leaves its fixtures behind is a suite that will fail
 * mysteriously one day — and in the meantime its rows show up on the real
 * Library shelf during local development.
 */
afterAll(async () => {
  await admin.from('content_items').delete().in('id', [guideId, replayId]);
}, 60_000);

describe('a stranger with the public key', () => {
  it('cannot read any content', async () => {
    const { data } = await anonClient().from('content_items').select('*');
    expect(data ?? []).toHaveLength(0);
  });

  it('cannot read entitlements', async () => {
    const { data } = await anonClient().from('entitlements').select('*');
    expect(data ?? []).toHaveLength(0);
  });

  it('cannot read the catalogue shelf either', async () => {
    const { data } = await anonClient().from('content_catalog').select('*');
    expect(data ?? []).toHaveLength(0);
  });
});

describe('a Circle member while the subscription is live', () => {
  it('sees the replay, including the unlisted video id', async () => {
    const email = uniqueEmail('circle-ativo');
    const future = new Date(Date.now() + 30 * 864e5).toISOString();
    await grant(email, 'circle', { expires_at: future });
    const client = await signedInAs(email);

    const { data } = await client.from('content_items').select('*').eq('id', replayId);
    expect(data).toHaveLength(1);
    expect(data![0].youtube_id).toBe('SEGREDO_NAO_LISTADO');
  });
});

describe('someone without the Circle', () => {
  it('gets zero rows for the replay, not an error', async () => {
    const email = uniqueEmail('sem-nada');
    const client = await signedInAs(email);

    const { data, error } = await client.from('content_items').select('*').eq('id', replayId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it('still sees the shelf, but the shelf carries no video id', async () => {
    const email = uniqueEmail('vitrine');
    const client = await signedInAs(email);

    const { data } = await client.from('content_catalog').select('*').eq('id', replayId);
    expect(data).toHaveLength(1);
    expect(data![0]).not.toHaveProperty('youtube_id');
    expect(data![0]).not.toHaveProperty('storage_path');
  });
});

describe('a Circle subscription that already expired', () => {
  it('opens nothing', async () => {
    const email = uniqueEmail('circle-vencido');
    const past = new Date(Date.now() - 864e5).toISOString();
    await grant(email, 'circle', { expires_at: past });
    const client = await signedInAs(email);

    const { data } = await client.from('content_items').select('*').eq('id', replayId);
    expect(data ?? []).toHaveLength(0);
  });
});

describe('a Protocol student', () => {
  it('keeps the guide two years after the arc started, because lifetime is expires_at NULL', async () => {
    const email = uniqueEmail('protocol-vitalicio');
    const twoYearsAgo = new Date(Date.now() - 730 * 864e5).toISOString();
    await grant(email, 'protocol', { starts_at: twoYearsAgo, expires_at: null });
    const client = await signedInAs(email);

    const { data } = await client.from('content_items').select('*').eq('id', guideId);
    expect(data).toHaveLength(1);
  });
});

describe('a Face a Face buyer', () => {
  it('does not get the Library, because face_a_face is not in required_products', async () => {
    const email = uniqueEmail('face-a-face');
    await grant(email, 'face_a_face');
    const client = await signedInAs(email);

    const { data: guide } = await client.from('content_items').select('*').eq('id', guideId);
    const { data: replay } = await client.from('content_items').select('*').eq('id', replayId);
    expect(guide ?? []).toHaveLength(0);
    expect(replay ?? []).toHaveLength(0);
  });
});

describe('access granted before the person ever signed in', () => {
  it('is already there on the very first request', async () => {
    const email = uniqueEmail('convidado-do-evento');
    await grant(email, 'connect'); // granted while no auth.users row exists
    const client = await signedInAs(email);

    const { data } = await client.from('content_items').select('*').eq('id', guideId);
    expect(data).toHaveLength(1);
  });

  it('gets adopted onto the account, so the admin screen can show it as claimed', async () => {
    const email = uniqueEmail('adotado');
    await grant(email, 'connect');
    await signedInAs(email);

    const id = await userIdFor(email);
    const { data } = await admin
      .from('entitlements')
      .select('user_id')
      .eq('email_norm', email.toLowerCase());
    expect(data![0].user_id).toBe(id);
  });
});

describe('one member against another', () => {
  it('cannot read someone else’s progress', async () => {
    const mine = uniqueEmail('dono');
    const theirs = uniqueEmail('curioso');
    const future = new Date(Date.now() + 30 * 864e5).toISOString();
    await grant(mine, 'circle', { expires_at: future });
    await grant(theirs, 'circle', { expires_at: future });

    const owner = await signedInAs(mine);
    await owner.from('progress').insert({
      user_id: await userIdFor(mine),
      content_item_id: replayId,
      position_seconds: 42,
    });

    const snooper = await signedInAs(theirs);
    const { data } = await snooper.from('progress').select('*').eq('content_item_id', replayId);
    expect(data ?? []).toHaveLength(0);
  });

  it('cannot read someone else’s entitlements', async () => {
    const target = uniqueEmail('alvo');
    await grant(target, 'protocol');
    const other = await signedInAs(uniqueEmail('bisbilhoteiro'));

    const { data } = await other
      .from('entitlements')
      .select('*')
      .eq('email_norm', target.toLowerCase());
    expect(data ?? []).toHaveLength(0);
  });
});

describe('a member who is not an admin', () => {
  it('cannot record progress against content they have no right to', async () => {
    const email = uniqueEmail('sem-direito');
    const client = await signedInAs(email);

    const { error } = await client.from('progress').insert({
      user_id: await userIdFor(email),
      content_item_id: replayId,
      position_seconds: 10,
    });
    expect(error).not.toBeNull();
  });

  it('cannot grant themselves an entitlement', async () => {
    const email = uniqueEmail('auto-promocao');
    const client = await signedInAs(email);

    const { error } = await client.from('entitlements').insert({
      email_norm: email.toLowerCase(),
      email_raw: email,
      product: 'protocol',
      source: 'manual',
    });
    expect(error).not.toBeNull();
  });

  it('cannot make themselves an admin', async () => {
    const email = uniqueEmail('quer-ser-admin');
    const client = await signedInAs(email);

    const { error } = await client
      .from('admin_users')
      .insert({ user_id: await userIdFor(email) });
    expect(error).not.toBeNull();
  });

  it('cannot even see who the admins are', async () => {
    const client = await signedInAs(uniqueEmail('lista-de-admins'));
    const { data } = await client.from('admin_users').select('*');
    expect(data ?? []).toHaveLength(0);
  });

  it('cannot read billing events', async () => {
    const client = await signedInAs(uniqueEmail('billing'));
    const { data } = await client.from('billing_events').select('*');
    expect(data ?? []).toHaveLength(0);
  });
});

/**
 * The audit trail exists so that "who gave this person access, and when" has
 * an answer months later. Its failure mode is silence: nobody reads it until
 * something is disputed, and by then the missing rows cannot be recovered.
 *
 * So the trigger is asserted from both sides — that it records, and that a
 * member cannot write into it to muddy the record.
 */
describe('the audit trail behind every access change', () => {
  it('records a grant, naming the product and the address', async () => {
    const email = uniqueEmail('auditada');

    const { data: granted, error } = await admin
      .from('entitlements')
      .insert({
        email_norm: email.toLowerCase(),
        email_raw: email,
        product: 'circle',
        source: 'manual',
      })
      .select('id')
      .single();
    expect(error).toBeNull();

    const { data: rows } = await admin
      .from('admin_audit')
      .select('action, target_email, payload')
      .eq('target_email', email.toLowerCase());

    expect(rows).toHaveLength(1);
    expect(rows![0].action).toBe('entitlement.insert');
    expect(rows![0].payload.product).toBe('circle');
    expect(rows![0].payload.entitlement_id).toBe(granted!.id);
  });

  it('records a revoke, keeping what the value was before', async () => {
    const email = uniqueEmail('revogada');
    const { data: granted } = await admin
      .from('entitlements')
      .insert({
        email_norm: email.toLowerCase(),
        email_raw: email,
        product: 'protocol',
        source: 'manual',
      })
      .select('id')
      .single();

    await admin.from('entitlements').update({ status: 'revoked' }).eq('id', granted!.id);

    const { data: rows } = await admin
      .from('admin_audit')
      .select('action, payload')
      .eq('target_email', email.toLowerCase())
      .order('created_at', { ascending: true });

    expect(rows).toHaveLength(2);
    expect(rows![1].action).toBe('entitlement.update');
    expect(rows![1].payload.status).toBe('revoked');
    expect(rows![1].payload.was.status).toBe('active');
  });

  it('survives the row being deleted, which is when it matters most', async () => {
    const email = uniqueEmail('apagada');
    const { data: granted } = await admin
      .from('entitlements')
      .insert({
        email_norm: email.toLowerCase(),
        email_raw: email,
        product: 'connect',
        source: 'manual',
      })
      .select('id')
      .single();

    await admin.from('entitlements').delete().eq('id', granted!.id);

    const { data: rows } = await admin
      .from('admin_audit')
      .select('action')
      .eq('target_email', email.toLowerCase())
      .order('created_at', { ascending: true });

    expect(rows!.map((r) => r.action)).toEqual(['entitlement.insert', 'entitlement.delete']);
  });

  it('cannot be read by a member who is not an admin', async () => {
    const client = await signedInAs(uniqueEmail('curiosa'));
    const { data } = await client.from('admin_audit').select('*');
    expect(data ?? []).toHaveLength(0);
  });

  it('cannot be forged by a member inventing a grant that never happened', async () => {
    const client = await signedInAs(uniqueEmail('forjadora'));
    const { error } = await client.from('admin_audit').insert({
      action: 'entitlement.insert',
      target_email: 'quem-quer-que-seja@exemplo.com',
    });
    expect(error).not.toBeNull();
  });
});

/**
 * Fase 9 — a área do aluno.
 *
 * O que muda de natureza: até aqui a plataforma guardava direito de acesso e
 * conteúdo de prateleira, iguais para todo mundo que comprou o mesmo produto.
 * Um report semanal é de uma pessoa só, e o conteúdo dele é dado de saúde.
 *
 * Uma política frouxa aqui não levanta erro nem exceção: ela devolve o
 * prontuário do aluno A para o aluno B, e ninguém percebe até alguém contar.
 */
describe('a área do aluno', () => {
  let docA: string;
  let docB: string;
  let emailA: string;
  let emailB: string;

  beforeAll(async () => {
    emailA = uniqueEmail('aluno-a');
    emailB = uniqueEmail('aluno-b');

    const insert = async (email: string, title: string) => {
      const { data, error } = await admin
        .from('student_documents')
        .insert({
          email_norm: email.toLowerCase().trim(),
          email_raw: email,
          kind: 'weekly_report',
          title,
          storage_path: `alunos/${email}/${Date.now()}-${Math.random()}.pdf`,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    };

    docA = await insert(emailA, 'Report semanal do aluno A');
    docB = await insert(emailB, 'Report semanal do aluno B');
  }, 60_000);

  afterAll(async () => {
    await admin.from('student_documents').delete().in('id', [docA, docB]);
  }, 60_000);

  it('não existe para quem não entrou', async () => {
    const { data } = await anonClient().from('student_documents').select('*');
    expect(data ?? []).toHaveLength(0);
  });

  it('entrega ao aluno o documento dele', async () => {
    const client = await signedInAs(emailA);
    const { data } = await client.from('student_documents').select('id, title');

    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(docA);
  });

  /** O critério de aceite da fase, escrito como teste. */
  it('não entrega ao aluno A nada do aluno B', async () => {
    const client = await signedInAs(emailA);

    const { data: byId } = await client
      .from('student_documents')
      .select('*')
      .eq('id', docB);
    expect(byId ?? []).toHaveLength(0);

    const { data: all } = await client.from('student_documents').select('id');
    expect((all ?? []).map((row) => row.id)).not.toContain(docB);
  });

  /**
   * Apagar é o que alguém faria para sumir com um contrato do próprio arco.
   * O aluno lê o que é dele e não escreve nada — nem o que é dele.
   */
  it('não deixa o aluno apagar nem alterar o próprio documento', async () => {
    const client = await signedInAs(emailA);

    await client.from('student_documents').delete().eq('id', docA);
    await client.from('student_documents').update({ title: 'outro' }).eq('id', docA);

    const { data } = await admin
      .from('student_documents')
      .select('title')
      .eq('id', docA)
      .single();

    expect(data!.title).toBe('Report semanal do aluno A');
  });

  it('não deixa o aluno criar documento para ninguém', async () => {
    const client = await signedInAs(emailA);
    const { error } = await client.from('student_documents').insert({
      email_norm: emailB.toLowerCase().trim(),
      email_raw: emailB,
      kind: 'contract',
      title: 'contrato forjado',
      storage_path: `alunos/forjado-${Date.now()}.pdf`,
    });
    expect(error).not.toBeNull();
  });

  /**
   * A trilha responde "quem abriu o report de quem, e quando". Se o próprio
   * aluno pudesse escrevê-la ou apagá-la, ela não responderia nada.
   */
  it('não deixa ninguém escrever nem ler a trilha de acesso', async () => {
    const client = await signedInAs(emailA);

    const { error } = await client.from('document_access_log').insert({
      document_id: docA,
      actor_role: 'own',
      action: 'download',
    });
    expect(error).not.toBeNull();

    const { data } = await client.from('document_access_log').select('*');
    expect(data ?? []).toHaveLength(0);
  });
});
