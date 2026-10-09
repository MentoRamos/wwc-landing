import type { Metadata } from 'next';
import { verifyLinkToken } from '@/lib/core/evento.core';
import { eventoConfig } from '@/lib/evento/config';
import { SurveyForm } from '@/components/imersao/SurveyForm';

/**
 * A pesquisa de qualificação da Imersão, que libera a Ficha da Hora Fixa.
 *
 * O link do e-mail T0 traz `?t=<buyer_id>.<hmac>`: com ele válido, a página
 * não pergunta o e-mail. Sem token (ou com token adulterado), cai no modo
 * "informe seu e-mail", e a server action confere se esse e-mail comprou o
 * ingresso. `?o=grupo|antigos` marca de onde a pessoa veio.
 *
 * Isolada como as outras páginas de `/imersao` (só o layout raiz em volta) e
 * nunca indexada: só faz sentido para quem comprou.
 */
export const metadata: Metadata = {
  title: 'Antes da imersão · 2 minutos',
  description: 'Pesquisa de dois minutos para quem vai estar na Imersão Performance e Longevidade.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const BODY_DARK = 'text-[1.09375rem] md:text-[1.1875rem] leading-[1.6] text-[rgba(244,242,238,0.78)]';
const HERO_EYEBROW =
  'font-[family-name:var(--font-label)] text-[0.8125rem] uppercase tracking-[0.15em] text-[var(--accent)] text-balance';

const ORIGINS = new Set(['grupo', 'antigos']);

export default async function ImersaoPesquisaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = typeof params.t === 'string' ? params.t : null;
  const token = raw && verifyLinkToken(raw, eventoConfig().linkSecret) ? raw : null;
  const o = typeof params.o === 'string' ? params.o : '';
  const origin = ORIGINS.has(o) ? o : token ? 't0' : 'email';

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-12 pb-24 md:pt-24">
      <div className="container-lp">
        <div className="max-w-[720px]">
          <p className={HERO_EYEBROW}>IMERSÃO PERFORMANCE E LONGEVIDADE</p>
          <h1 className="page-title mt-4 text-[2rem] leading-[1.08] md:text-[2.75rem]">Antes da imersão · 2 minutos</h1>
          <p className={`mt-6 ${BODY_DARK}`}>
            Essas respostas me ajudam a preparar as duas noites em cima de quem vai estar na sala: os aparelhos, os
            horários e o que cada um quer destravar. No final você baixa a Ficha da Hora Fixa.
          </p>
          <SurveyForm token={token} origin={origin} />
        </div>
      </div>
    </div>
  );
}
