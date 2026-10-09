import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signLinkToken } from '@/lib/core/evento.core';

/**
 * A server action da pesquisa com um Supabase falso. Ela é um POST que
 * qualquer um chama: sem o token assinado do e-mail T0, quem digita o e-mail
 * de outra pessoa não pode reescrever o que essa pessoa respondeu. Só o
 * caminho com token atualiza uma resposta que já existe.
 */
type Upsert = { row: Record<string, unknown>; options: Record<string, unknown> };
const upserts: Upsert[] = [];
const BUYER = { id: '11111111-2222-3333-4444-555555555555', edition_id: 'ed-1', email_norm: 'maria@x.com' };

function fakeAdmin() {
  const buyers = {
    select: () => buyers,
    eq: () => buyers,
    order: () => buyers,
    limit: () => buyers,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [BUYER], error: null }).then(resolve),
  };
  return {
    from: (table: string) =>
      table === 'event_buyers'
        ? buyers
        : {
            upsert: async (row: Record<string, unknown>, options: Record<string, unknown>) => {
              upserts.push({ row, options });
              return { error: null };
            },
          },
    storage: {
      from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://ficha' }, error: null }) }),
    },
  };
}
vi.mock('@/lib/supabase/admin', () => ({ adminClient: () => fakeAdmin() }));

const { submitSurvey } = await import('@/app/imersao/pesquisa/actions');

const SECRET = 'segredo-de-teste-com-bastante-entropia-0123';

function form(over: Record<string, string> = {}): FormData {
  const data = new FormData();
  const base: Record<string, string | string[]> = {
    aparelho: ['whoop'],
    tempo_uso: '6m_2a',
    acorda_util: '6h15',
    acorda_sabado: '8h',
    atividade: 'socio_ceo',
    renda: '50k_100k',
    destravar: ['energia'],
    quem_le: 'ninguem',
    investimento: '1500_3000',
    consentimento: 'on',
    origem: 't0',
    ...over,
  };
  for (const [key, value] of Object.entries(base)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

beforeEach(() => {
  upserts.length = 0;
  vi.stubEnv('EVENTO_LINK_SECRET', SECRET);
});
afterEach(() => vi.unstubAllEnvs());

describe('quem pode reescrever uma resposta', () => {
  it('sem token, pelo e-mail: só insere se ainda não houver resposta', async () => {
    const state = await submitSurvey({ status: 'idle' }, form({ email: 'maria@x.com' }));
    expect(upserts).toHaveLength(1);
    expect(upserts[0].options).toMatchObject({ onConflict: 'edition_id,email_norm', ignoreDuplicates: true });
    // A resposta é a mesma do caminho normal: a Ficha, sem dizer se já havia resposta.
    expect(state).toEqual({ status: 'done', fichaUrl: 'https://ficha' });
  });

  it('com token forjado: tratado como sem token', async () => {
    await submitSurvey({ status: 'idle' }, form({ t: `${BUYER.id}.forjado`, email: 'maria@x.com' }));
    expect(upserts[0].options).toMatchObject({ ignoreDuplicates: true });
  });

  it('com o token assinado do e-mail T0: atualiza a resposta existente', async () => {
    const state = await submitSurvey({ status: 'idle' }, form({ t: signLinkToken(BUYER.id, SECRET) }));
    expect(upserts[0].options).toMatchObject({ onConflict: 'edition_id,email_norm', ignoreDuplicates: false });
    expect(state).toEqual({ status: 'done', fichaUrl: 'https://ficha' });
  });
});
