import type { Metadata } from 'next';
import { Barlow, Barlow_Condensed, Playfair_Display } from 'next/font/google';
import './globals.css';
import { resolveSiteUrl } from '@/lib/core/site.core';

const display = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

/*
 * As duas sans da marca, que a plataforma nunca carregou.
 *
 * O `wealth-wellness-DESIGN.md` nomeia o par Playfair + Barlow Condensed como
 * a assinatura, e proíbe por escrito cair em Inter, Roboto ou Arial. Mesmo
 * assim o corpo desta plataforma vinha da pilha do sistema, ou seja, Helvetica
 * no Mac e Segoe no Windows: a mesma página com duas caras, nenhuma delas a
 * da marca.
 *
 * Barlow entra no corpo, na tabela e no botão, onde a serif atrapalha a
 * leitura de ferramenta. Barlow Condensed entra nos rótulos em caixa alta com
 * tracking largo, que é o gesto que o documento chama de cromo de navegação.
 * Playfair continua sozinha nos títulos e nos números grandes.
 */
const body = Barlow({
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

const condensed = Barlow_Condensed({
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  display: 'swap',
  weight: ['500', '600'],
});

const siteUrl = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Wealth & Wellness',
    template: '%s | Wealth & Wellness',
  },
  description:
    'Saúde mensurável e performance previsível. Acompanhamento, comunidade e o evento Wealth & Wellness Connect.',
  authors: [{ name: 'Kauã Ramos' }],
  creator: 'Kauã Ramos',
  publisher: 'Wealth & Wellness',
  icons: { icon: '/icon.svg' },
};

/**
 * Desarma qualquer reveal que tenha sobrado escondido quando nao ha JavaScript
 * para revela-lo. `!important` porque o que estamos sobrescrevendo e style
 * inline, e so isso ganha dele.
 */
const NOSCRIPT_REVEAL = [
  '[style*="opacity:0"][style*="transform:"]',
  '[style*="clip-path:inset(100%"]',
].join(',') + '{opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important}';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${condensed.variable}`}>
      <head>
        {/*
          A rede por baixo do resto.

          O Framer Motion escreve o estado inicial como style inline no HTML do
          servidor, entao um `initial={{ opacity: 0 }}` vira texto invisivel na
          pagina servida. O ScrollReveal deixou de fazer isso, mas ainda ha
          animacao de Framer no cromo e nos carrosseis, e um componente novo
          pode trazer o padrao de volta sem ninguem perceber.

          O seletor e proposital: so pega quem tem `opacity:0` E `transform`,
          que e a assinatura de um reveal de conteudo. Os brilhos dourados de
          hover sao `opacity:0` sem transform, e devem mesmo continuar
          escondidos — desarmar tudo poria borda dourada em cada cartao de quem
          navega sem JavaScript.
        */}
        <noscript>
          <style>{NOSCRIPT_REVEAL}</style>
        </noscript>
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[99999] focus:bg-[var(--accent)] focus:text-[var(--bg)] focus:px-4 focus:py-2 focus:text-sm font-medium"
        >
          Pular para o conteúdo
        </a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
