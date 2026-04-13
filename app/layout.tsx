import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollProgress } from '@/components/ui/ScrollProgress';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { AudioToggle } from '@/components/ui/AudioToggle';
import { JsonLd } from '@/components/seo/JsonLd';

const display = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://wwc.ae.club'),
  title: {
    default: 'Wealth & Wellness Connect — O evento premium de saúde e alta performance para CEOs',
    template: '%s | WWC',
  },
  description:
    'Evento exclusivo para 40 CEOs e executivos sobre saúde baseada em dados, wearables, biohacking e alta performance. 2ª edição em breve.',
  keywords: [
    'evento premium',
    'CEO',
    'saúde',
    'wearables',
    'biohacking',
    'alta performance',
    'Oura Ring',
    'Whoop',
    'networking executivo',
    'longevidade',
    'CEO quantificado',
  ],
  authors: [{ name: 'Wealth & Wellness Connect' }],
  creator: 'UWell Health Club',
  publisher: 'UWell Health Club',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: 'Wealth & Wellness Connect',
    title: 'Wealth & Wellness Connect — A Era do CEO Quantificado',
    description:
      'Evento exclusivo para 40 CEOs e executivos. Saúde baseada em dados, wearables e biohacking. 2ª edição em breve.',
    images: [
      {
        url: '/photos/presenting.jpg',
        width: 1200,
        height: 630,
        alt: 'Wealth & Wellness Connect — Keynote',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wealth & Wellness Connect — A Era do CEO Quantificado',
    description:
      'Evento exclusivo para 40 CEOs e executivos. Saúde baseada em dados, wearables e alta performance.',
    images: ['/photos/presenting.jpg'],
  },
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <head>
        <JsonLd />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[99999] focus:bg-[var(--accent)] focus:text-[var(--bg)] focus:px-4 focus:py-2 focus:text-sm font-medium"
        >
          Pular para o conteúdo
        </a>
        <ScrollProgress />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <AudioToggle />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
