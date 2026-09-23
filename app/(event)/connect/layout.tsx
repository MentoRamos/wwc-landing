import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollProgress } from '@/components/ui/ScrollProgress';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { AudioToggle } from '@/components/ui/AudioToggle';
import { JsonLd } from '@/components/seo/JsonLd';

/**
 * The event keeps its own chrome. The header navigates by anchor into the
 * event's sections, and the audio toggle plays audio recorded at the event, so
 * neither belongs on the rest of the platform.
 */
export const metadata: Metadata = {
  title: {
    absolute:
      'Wealth & Wellness Connect: o evento premium de saúde e alta performance para CEOs',
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
  alternates: { canonical: '/connect' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/connect',
    siteName: 'Wealth & Wellness Connect',
    title: 'Wealth & Wellness Connect · A Era do CEO Quantificado',
    description:
      'Evento exclusivo para 40 CEOs e executivos. Saúde baseada em dados, wearables e biohacking. 2ª edição em breve.',
    images: [
      {
        url: '/photos/kaua-portrait-seated.jpg',
        width: 1200,
        height: 630,
        alt: 'Keynote do Wealth & Wellness Connect',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wealth & Wellness Connect · A Era do CEO Quantificado',
    description:
      'Evento exclusivo para 40 CEOs e executivos. Saúde baseada em dados, wearables e alta performance.',
    images: ['/photos/kaua-portrait-seated.jpg'],
  },
};

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd />
      <ScrollProgress />
      <Header />
      {children}
      <Footer />
      <AudioToggle />
      <WhatsAppFloat />
    </>
  );
}
