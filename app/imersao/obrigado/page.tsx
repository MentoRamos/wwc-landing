import type { Metadata } from 'next';
import Image from 'next/image';
import { IMERSAO_GRUPO_WHATSAPP_URL } from '@/lib/imersao';
import { MetaPixel } from '@/components/MetaPixel';

/**
 * Where Kiwify sends a paid ticket buyer. One job: get them into the event
 * WhatsApp group (the only channel until the first night). Never indexed: it
 * only makes sense right after a payment.
 *
 * The Purchase is not fired here. The Kiwify webhook sends it server-side
 * (Meta Conversions API) for every approved order, including buyers who
 * declined cookies. A browser Purchase on top would double count the sale,
 * since this URL has no order id to share as event_id. The pixel stays for
 * the PageView, behind the consent banner as everywhere else.
 */

const CTA_CLASS =
  'inline-flex w-full items-center justify-center rounded-full bg-[#C9A84C] px-8 py-[18px] ' +
  'text-[1.0625rem] font-semibold text-[#0D0D0D] transition-colors duration-300 hover:bg-[#D4B85C] sm:w-auto';
const BODY_DARK = 'text-[1.09375rem] md:text-[1.1875rem] leading-[1.6] text-[rgba(244,242,238,0.78)]';
const CAPTION_DARK = 'text-[0.9375rem] uppercase tracking-[0.08em] text-[rgba(244,242,238,0.78)]';
const HERO_EYEBROW =
  'font-[family-name:var(--font-label)] text-[0.8125rem] uppercase tracking-[0.15em] text-[var(--accent)] text-balance';

const PASSOS = [
  {
    titulo: 'Entre no grupo agora',
    texto: 'É por lá que vão o link da sala no Google Meet, os lembretes e o link do replay. Fora do grupo você não recebe o acesso.',
  },
  {
    titulo: 'Deixe o seu wearable sincronizado',
    texto:
      'Na noite 2 você abre os seus últimos 30 dias de dados. Confira se o app do seu relógio ou anel está atualizado e sincronizando.',
  },
  {
    titulo: 'Reserve as duas noites na agenda',
    texto: 'Quarta 28/10 e quinta 29/10, das 19h30 às 21h30 (Brasília). Se não puder ao vivo, o replay fica no grupo até domingo, 01/11, às 23h59.',
  },
];

export const metadata: Metadata = {
  title: 'Ingresso confirmado · Imersão Performance e Longevidade',
  description: 'Próximo passo: entrar no grupo da imersão no WhatsApp.',
  robots: { index: false, follow: false },
};

export default function ImersaoObrigadoPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] pt-12 pb-24 md:pt-24">
      <div className="container-lp">
        <div className="grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr] md:gap-16">
          <div className="max-w-[680px]">
            <p className={HERO_EYEBROW}>INGRESSO CONFIRMADO</p>
            <h1 className="page-title mt-4 text-[2rem] leading-[1.08] md:text-[2.75rem]">
              Você está dentro. Falta um passo: entrar no grupo da imersão.
            </h1>
            <p className={`mt-6 ${BODY_DARK}`}>
              Todo o acesso da Imersão Performance e Longevidade passa pelo grupo no WhatsApp: o link da sala, os
              lembretes antes de cada noite e o link do replay, disponível até domingo, 01/11, às 23h59.
            </p>
            <p className={`mt-6 ${CAPTION_DARK}`}>
              28 e 29 de outubro, quarta e quinta · 19h30 às 21h30 (Brasília) · Ao vivo no Google Meet
            </p>
            <a
              href={IMERSAO_GRUPO_WHATSAPP_URL}
              data-cta="grupo"
              target="_blank"
              rel="noopener noreferrer"
              className={`${CTA_CLASS} mt-8`}
            >
              ENTRAR NO GRUPO DA IMERSÃO
            </a>
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden border border-[var(--border)] md:aspect-[3/4]">
            <Image
              src="/photos/kaua-portrait-smile.jpg"
              alt="Kauã Ramos, health manager da Wealth & Wellness, sorrindo"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              quality={75}
              className="object-cover object-top"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg)]/40 via-transparent to-transparent" />
          </div>
        </div>

        <ol className="mt-16 grid gap-6 md:mt-20 md:grid-cols-3">
          {PASSOS.map((passo, i) => (
            <li key={passo.titulo} className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 md:p-8">
              <p className="stat-num text-[var(--accent)]">{i + 1}</p>
              <h2 className="mt-3 font-display text-[1.375rem] leading-[1.2] text-[var(--text-1)]">{passo.titulo}</h2>
              <p className={`mt-3 ${BODY_DARK}`}>{passo.texto}</p>
            </li>
          ))}
        </ol>

        <p className={`mt-12 max-w-[680px] ${BODY_DARK}`}>
          Alguma dúvida sobre o pagamento ou o acesso? Responda o e-mail de confirmação da Kiwify que eu te ajudo.
        </p>
      </div>
      <MetaPixel />
    </div>
  );
}
