import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getArticle } from '@/lib/articles/queries';
import { formatLongDate } from '@/lib/core/format.core';

/**
 * O cartão do link, que é como quase todo artigo vai ser aberto: colado no
 * WhatsApp. Sem ele o cartão cai na descrição genérica da plataforma, e o
 * artigo do dia chega parecendo link de site.
 *
 * Bodoni Moda é o substituto aberto do Didot da marca, o mesmo que os kits do
 * servidor usam. O arquivo mora em `assets/fonts` porque o `ImageResponse`
 * não enxerga a pilha de fontes do CSS.
 */
export const alt = 'Artigo do W&W Circle';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#F4F2EE';
const MUTED = 'rgba(244, 242, 238, 0.66)';
const GOLD = '#C9A84C';
const HAIRLINE = 'rgba(244, 242, 238, 0.14)';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, bodoni] = await Promise.all([
    getArticle(slug).catch(() => null),
    readFile(join(process.cwd(), 'assets/fonts/BodoniModa-500.ttf')),
  ]);

  const title = article?.title ?? 'Artigos do W&W Circle';
  // Título longo vira fonte menor em vez de estourar a moldura.
  const titleSize = title.length > 70 ? 58 : title.length > 45 ? 68 : 80;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0D0D0D',
          padding: 36,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: `1px solid ${HAIRLINE}`,
            padding: '56px 64px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: GOLD,
            }}
          >
            W&amp;W Circle · Artigo
          </div>

          <div
            style={{
              display: 'flex',
              fontFamily: 'Bodoni',
              fontSize: titleSize,
              lineHeight: 1.08,
              color: INK,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', width: 72, height: 1, background: GOLD }} />
            <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>
              {article
                ? `Kauã Ramos · ${formatLongDate(article.published_at)} · kauaramos.com`
                : 'kauaramos.com'}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Bodoni', data: bodoni, style: 'normal', weight: 500 }],
    },
  );
}
