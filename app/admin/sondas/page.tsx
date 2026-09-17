import type { Metadata } from 'next';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Meta } from '@/components/ui/Meta';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { DiscardProbeButton } from '@/components/admin/DiscardProbeButton';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { webhookSecret } from '@/lib/kiwify/config';
import { matchOf, signatureGuesses } from '@/lib/core/signature-probe.core';
import { formatDateTime } from '@/lib/core/format.core';

export const metadata: Metadata = {
  title: 'Sondas',
  robots: { index: false, follow: false },
};

type Row = {
  id: string;
  provider: string;
  reason: string;
  sources: string[] | null;
  signature_seen: string | null;
  body: string | null;
  body_bytes: number | null;
  received_at: string;
};

/**
 * O que bateu na porta e não entrou.
 *
 * A tabela existia sem leitor: guardava o corpo e a assinatura de todo evento
 * recusado, e a única forma de ver isso era abrir o SQL editor da produção.
 * Numa venda que não entrou, isso é tempo que ninguém tem.
 *
 * A página não se limita a mostrar a linha — ela faz a conta. Para cada sonda,
 * calcula o que a assinatura seria sob cada forma plausível e marca a que bate
 * com o que chegou. Quando uma bate, o conserto é uma linha em
 * `detectSignature`. Quando NENHUMA bate, isso também é resposta: a Kiwify
 * assina algo que não é o corpo cru, e o caminho é outro.
 *
 * A leitura vai pelo cliente do usuário, não por service role: quem autoriza é
 * a política `webhook_probes_read_admin`, e para quem não for admin o layout
 * acima já devolveu 404.
 */
export default async function SondasPage() {
  await requireAdmin();
  const supabase = await serverClient();

  const { data, error } = await supabase
    .from('webhook_probes')
    .select('id, provider, reason, sources, signature_seen, body, body_bytes, received_at')
    .order('received_at', { ascending: false })
    .limit(50);

  const rows = (data ?? []) as Row[];
  const secret = webhookSecret();

  return (
    <div className="flex flex-col gap-12">
      <SectionHeading
        eyebrow="Sondas"
        title="O que bateu na porta e não entrou"
        lede="Todo evento de cobrança recusado deixa aqui o corpo e a assinatura que vieram. É o que transforma um 400 mudo em conserto de um deploy."
      />

      {!secret && (
        <p role="alert" className="prose-body">
          O token do webhook não está configurado neste ambiente, então não dá para
          calcular o que a assinatura deveria ser. As sondas aparecem mesmo assim.
        </p>
      )}

      {error ? (
        <p className="prose-body">Não consegui ler as sondas: {error.message}</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhuma sonda.">
          Ou nenhum evento foi recusado, ou a assinatura já está sendo reconhecida.
          Nos dois casos, é a notícia boa.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-8">
          {rows.map((row) => {
            const when = formatDateTime(row.received_at);
            const guesses = secret ? signatureGuesses(row.body ?? '', secret) : [];
            // O veredito é montado como UMA string, e não como texto seguido
            // de expressão: dois nós de texto vizinhos saem do servidor com um
            // comentário do Next entre eles, e aí o veredito deixa de ser
            // procurável no HTML que o aceite verifica.
            const match = matchOf(guesses, row.signature_seen);

            return (
              <li
                key={row.id}
                className="flex flex-col gap-6 border border-[var(--border)] bg-[var(--bg-card)] p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text-1)]">{row.reason}</p>
                    <Meta
                      className="mt-1"
                      parts={[row.provider, when, `${row.body_bytes ?? 0} bytes`]}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-5">
                    {match ? (
                      <Badge tone="accent">{`Bate com ${match}`}</Badge>
                    ) : (
                      <Badge>Nenhuma forma conhecida bate</Badge>
                    )}
                    <DiscardProbeButton id={row.id} when={when} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-4)]">
                    De onde a assinatura veio
                  </p>
                  {row.sources && row.sources.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {row.sources.map((source) => (
                        <li
                          key={source}
                          className="border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-2)]"
                        >
                          {source}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[var(--text-3)]">
                      Nenhuma. O evento chegou sem nada que se parecesse com assinatura.
                    </p>
                  )}
                </div>

                {row.signature_seen && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-4)]">
                      O que chegou · o que deveria ser
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[34rem] text-left text-xs">
                        <tbody>
                          <tr className="border-b border-[var(--border)]">
                            <th
                              scope="row"
                              className="whitespace-nowrap py-2 pr-6 font-normal text-[var(--text-2)]"
                            >
                              chegou
                            </th>
                            <td className="break-all py-2 font-mono text-[var(--text-1)]">
                              {row.signature_seen}
                            </td>
                          </tr>
                          {guesses.map((guess) => (
                            <tr
                              key={guess.label}
                              className="border-b border-[var(--border)] last:border-0"
                            >
                              <th
                                scope="row"
                                className={`whitespace-nowrap py-2 pr-6 font-normal ${
                                  guess.label === match
                                    ? 'text-[var(--accent)]'
                                    : 'text-[var(--text-3)]'
                                }`}
                              >
                                {guess.label}
                              </th>
                              <td
                                className={`break-all py-2 font-mono ${
                                  guess.label === match
                                    ? 'text-[var(--accent)]'
                                    : 'text-[var(--text-4)]'
                                }`}
                              >
                                {guess.digest}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-4)]">
                    O corpo, como chegou
                  </p>
                  <p className="text-xs text-[var(--text-3)]">
                    Tem nome, e-mail e documento de quem comprou. Descarte a sonda quando
                    ela já tiver explicado o que precisava.
                  </p>
                  <pre className="max-h-80 overflow-auto border border-[var(--border)] bg-[var(--bg)] p-4 text-xs text-[var(--text-2)]">
                    {row.body ?? '(vazio)'}
                  </pre>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
