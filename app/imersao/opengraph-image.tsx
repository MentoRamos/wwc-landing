import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * O cartão de link do WhatsApp/Twitter/LinkedIn pra /imersao.
 *
 * Sem logo, como a regra da página inteira pede: a foto do Kauã carrega a
 * identidade, não um selo. A foto vem embutida como data URL, lida do disco
 * a cada request, em vez de buscada por HTTP na própria URL pública (como o
 * cartão do Circle faz): esta função não depende do próprio deploy estar de
 * pé nem de rede saindo do runtime da imagem, só do arquivo já existir no
 * filesystem — o mesmo motivo por que a fonte já é lida assim ao lado.
 */
export const alt = 'Imersão Performance e Longevidade · 28 e 29/10';
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
            justifyContent: 'center',
            padding: '0 40px 0 72px',
            gap: 22,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              letterSpacing: 5,
              textTransform: 'uppercase',
              color: GOLD,
            }}
          >
            Imersão · 2 noites ao vivo
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Bodoni',
              fontSize: 62,
              lineHeight: 1.1,
              color: IVORY,
              maxWidth: 600,
            }}
          >
            Performance e Longevidade
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>
            28 e 29/10 · 19h30 · Ao vivo online
          </div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: GOLD }}>
            Ingresso R$ 97
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
