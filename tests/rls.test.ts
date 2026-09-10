import { describe, it, expect, beforeAll } from 'vitest';
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
