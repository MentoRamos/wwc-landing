import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * O cartão de link do WhatsApp/Twitter/LinkedIn pra `/imersao/protocolo`.
 *
 * Sem este arquivo, a página herdaria o cartão de `/imersao` (28 e 29/10,
 * ingresso R$ 97), que é o evento errado para quem já está olhando a oferta
 * de acompanhamento. Mesma abordagem do arquivo irmão
 * (`app/imersao/opengraph-image.tsx`): `ImageResponse`, a mesma fonte
 * Bodoni, a mesma paleta jet/gold, e a foto lida do disco (não buscada por
 * HTTP), pelos mesmos dois motivos de lá: nenhuma dependência do próprio
 * deploy estar de pé, nenhuma dependência de rede saindo do runtime da
 * imagem.
 *
 * Sem preço (a oferta é apresentada ao vivo, no pitch da imersão, nunca no
 * link) e sem data de evento (o Protocol não tem uma data fixa, é um
 * acompanhamento contínuo de 90 ou 180 dias).
 */
export const alt = 'W&W Protocol · acompanhamento individual, 90 ou 180 dias';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const JET = '#0D0D0D';
const IVORY = '#F4F2EE';
const GOLD = '#C9A84C';
const MUTED = 'rgba(244, 242, 238, 0.72)';

export default async function Image() {
  const [bodoni, photo] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/BodoniModa-500.ttf')),
    readFile(join(process.cwd(), 'public/photos/kaua-portrait-seated.jpg')),
  ]);
  const photoSrc = `data:image/jpeg;base64,${photo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: JET,
        }}
      >
        <div
          style={{
            flex: 1.3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '68px 40px 56px 72px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                letterSpacing: 5,
                textTransform: 'uppercase',
                color: GOLD,
              }}
            >
              W&W Protocol
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Bodoni',
                fontSize: 42,
                lineHeight: 1.22,
                color: IVORY,
                maxWidth: 610,
              }}
            >
              Alguém lendo o seu wearable toda semana, contra a sua própria linha de base.
            </div>
          </div>
          <div style={{ display: 'flex', maxWidth: 560, fontSize: 21, lineHeight: 1.4, color: MUTED }}>
            Acompanhamento individual com Kauã Ramos · 90 ou 180 dias
          </div>
        </div>
        <div style={{ position: 'relative', width: 480, height: 630, display: 'flex' }}>
          <img
            src={photoSrc}
            alt=""
            width={480}
            height={630}
            style={{ width: 480, height: 630, objectFit: 'cover' }}
          />
          {/* Costura suave entre a foto e o fundo, sem borrar (a marca proíbe blur). */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 160,
              height: 630,
              display: 'flex',
              background: `linear-gradient(90deg, ${JET} 0%, rgba(13,13,13,0) 100%)`,
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Bodoni', data: bodoni, style: 'normal', weight: 500 }],
    },
  );
}
