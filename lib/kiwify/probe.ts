import type { SupabaseClient } from '@supabase/supabase-js';
import { alertAdmin } from '@/lib/alerts';

/** Corpo truncado: quem despeja lixo no endereço não enche o banco por isso. */
const MAX_BODY = 8000;

/**
 * Registra um evento que NÃO virou acesso, e avisa o Kauã na primeira vez.
 *
 * O webhook responde 200 a quase tudo de propósito, então uma recusa não
 * aparece em lugar nenhum: nem para a Kiwify, que só saberia repetir, nem para
 * quem pagou. Esta é a única superfície onde ela fica.
 *
 * O aviso é calado quando já houve um na última hora. Sem isso, qualquer um
 * que descubra o endereço e poste lixo em série vira uma caixa de entrada
 * cheia — e a caixa cheia é exatamente onde o aviso que importa se perde.
 */
export async function recordProbe(
  admin: SupabaseClient,
  input: {
    reason: string;
    raw: string;
    candidates: { source: string; value: string }[];
  },
): Promise<void> {
  const { count } = await admin
    .from('webhook_probes')
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'kiwify')
    .gte('received_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

  const { error } = await admin.from('webhook_probes').insert({
    provider: 'kiwify',
    reason: input.reason,
    sources: input.candidates.map((c) => `${c.source}=${c.value}`),
    signature_seen: input.candidates[0]?.value ?? null,
    body: input.raw.slice(0, MAX_BODY),
    body_bytes: input.raw.length,
  });

  if (error) {
    console.error('[kiwify] não consegui registrar a sonda', { code: error.code });
  }

  if ((count ?? 0) > 0) return;

  await alertAdmin('Um evento de cobrança foi recusado', [
    `Motivo: ${input.reason}`,
    `Assinaturas que vieram: ${input.candidates.map((c) => c.source).join(', ') || 'nenhuma'}`,
    `Tamanho do corpo: ${input.raw.length} bytes`,
    'O corpo ficou em `webhook_probes` (só admin lê). Se foi uma compra de verdade, dá para conceder o acesso à mão em /admin/acessos enquanto a assinatura não estiver entendida.',
  ]);
}
