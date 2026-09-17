import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { DiscardProbeButton } from '@/components/admin/DiscardProbeButton';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { webhookSecret } from '@/lib/kiwify/config';
import { matchOf, shownGuesses, signatureGuesses, summarizeProbe } from '@/lib/core/signature-probe.core';
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

/** Valor longo vira valor legível: o que importa é reconhecer, não transcrever. */
function short(value: string, keep = 44): string {
  return value.length <= keep ? value : `${value.slice(0, keep)}…`;
}

/**
 * Os avisos de compra que a plataforma recusou.
 *
 * A primeira versão desta tela respondia à pergunta de quem escreve o código
 * ("qual algoritmo a Kiwify usou?") e despejava oito digests na cara de quem
 * abrisse. A pergunta de quem recebe o dinheiro é outra e vem antes: alguém
 * pagou e não recebeu? Quem?
 *
 * Então a tela responde nessa ordem. Em cima, em português: o que aconteceu,
 * quem comprou, o que fazer agora. A conta dos algoritmos continua sendo feita
 * — é ela que conserta o problema de vez — mas fica dobrada dentro de
 * "detalhes técnicos", para quem for agir sobre ela.
 *
 * Nada aqui mostra o token do webhook. Ele é segredo compartilhado com a
 * Kiwify, e segredo em tela vaza por screenshot.
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
        title="Avisos de compra que não foram aceitos"
        lede="A Kiwify avisa a plataforma quando alguém compra, e o aviso vem assinado para provar que veio mesmo dela. O que chega com assinatura que a plataforma não reconhece é recusado, e para aqui."
      />

      {error ? (
        <p className="prose-body">Não consegui ler as sondas: {error.message}</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Nada aqui, e isso é bom.">
          Ou nenhum aviso de compra foi recusado, ou a assinatura da Kiwify já está
          sendo reconhecida. Nos dois casos, não há nada para você fazer.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-10">
          {rows.map((row) => {
            const when = formatDateTime(row.received_at);
            const resumo = summarizeProbe(row.body);
            const match = secret ? matchOf(signatureGuesses(row.body ?? '', secret), row.signature_seen) : null;

            return (
              <li
                key={row.id}
                className="flex flex-col gap-6 border border-[var(--border)] bg-[var(--bg-card)] p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text-1)]">
                      {resumo ? 'Um aviso de compra foi recusado' : 'Alguém postou algo que não é um aviso de compra'}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-4)]">
                      {when}
                    </p>
                  </div>
                  <DiscardProbeButton id={row.id} when={when} />
                </div>

                {resumo ? (
                  <>
                    <dl className="grid gap-px border border-[var(--border)] sm:grid-cols-3">
                      <div className="bg-[var(--bg)] px-4 py-3">
                        <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-4)]">
                          Quem comprou
                        </dt>
                        <dd className="mt-1 break-all text-sm text-[var(--text-1)]">
                          {resumo.email || 'não veio no aviso'}
                        </dd>
                      </div>
                      <div className="bg-[var(--bg)] px-4 py-3">
                        <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-4)]">
                          O que aconteceu
                        </dt>
                        <dd className="mt-1 text-sm text-[var(--text-1)]">{resumo.event}</dd>
                      </div>
                      <div className="bg-[var(--bg)] px-4 py-3">
                        <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-4)]">
                          Produto na Kiwify
                        </dt>
                        <dd className="mt-1 break-all text-sm text-[var(--text-1)]">
                          {resumo.productId || 'não veio no aviso'}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-col gap-3 border-l-2 border-[var(--accent)] pl-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-4)]">
                        O que fazer agora
                      </p>
                      <p className="prose-body">
                        Se a compra foi de verdade, essa pessoa pagou e não recebeu o acesso.
                        Libere na mão em{' '}
                        <Link
                          href="/admin/acessos"
                          className="text-[var(--accent)] underline underline-offset-4"
                        >
                          acessos
                        </Link>
                        , que leva meio minuto e resolve para ela hoje.
                      </p>
                      {match ? (
                        <p className="prose-body">
                          {`E o conserto definitivo já está aqui: a assinatura confere pelo formato ${match}. Mande esse nome para o Claude e a plataforma passa a aceitar sozinha.`}
                        </p>
                      ) : (
                        <p className="prose-body">
                          O conserto definitivo ainda depende de uma olhada: a assinatura que
                          veio não corresponde a nenhum formato conhecido. Mande os detalhes
                          técnicos abaixo para o Claude.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="prose-body">
                    O que chegou não tem cara de compra: sem identificação de evento e sem
                    cliente. Provavelmente é varredura automática da internet batendo no
                    endereço, ou um teste. Pode descartar.
                  </p>
                )}

                <details className="border border-[var(--border)]">
                  <summary className="cursor-pointer px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] transition hover:text-[var(--accent)]">
                    Detalhes técnicos
                  </summary>

                  <div className="flex flex-col gap-6 border-t border-[var(--border)] p-4">
                    <div className="flex flex-col gap-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-4)]">
                        Motivo da recusa
                      </p>
                      <p className="text-xs text-[var(--text-2)]">
                        {row.reason} · {row.body_bytes ?? 0} bytes · {row.provider}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-4)]">
                        De onde a assinatura veio
                      </p>
                      {row.sources && row.sources.length > 0 ? (
                        <ul className="flex flex-col gap-1">
                          {row.sources.map((source) => (
                            <li key={source} className="break-all font-mono text-xs text-[var(--text-3)]">
                              {short(source, 80)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[var(--text-3)]">
                          Nenhuma. O aviso chegou sem nada que se parecesse com assinatura.
                        </p>
                      )}
                    </div>

                    {row.signature_seen && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-4)]">
                          O que chegou, e o que cada formato daria
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[30rem] text-left text-xs">
                            <tbody>
                              <tr className="border-b border-[var(--border)]">
                                <th
                                  scope="row"
                                  className="whitespace-nowrap py-2 pr-6 font-normal text-[var(--text-2)]"
                                >
                                  chegou
                                </th>
                                <td className="break-all py-2 font-mono text-[var(--text-1)]">
                                  {short(row.signature_seen, 80)}
                                </td>
                              </tr>
                              {(secret ? shownGuesses(row.body ?? '', secret) : []).map((guess) => (
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
                        O aviso, como chegou
                      </p>
                      <p className="text-xs text-[var(--text-3)]">
                        Tem dado de quem comprou. Descarte a sonda quando ela já tiver
                        explicado o que precisava.
                      </p>
                      <pre className="max-h-80 overflow-auto border border-[var(--border)] bg-[var(--bg)] p-4 text-xs text-[var(--text-2)]">
                        {row.body ?? '(vazio)'}
                      </pre>
                    </div>
                  </div>
                </details>

                <div>
                  {match ? (
                    <Badge tone="accent">{`Formato descoberto: ${match}`}</Badge>
                  ) : (
                    <Badge>Formato ainda desconhecido</Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
