import type { Metadata } from 'next';
import { Playfair_Display } from 'next/font/google';
import './globals.css';
import { resolveSiteUrl } from '@/lib/core/site.core';

const display = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={display.variable}>
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
