import type { Metadata } from 'next';
import { Inter, Instrument_Serif, Space_Grotesk } from 'next/font/google';
import { AppProviders } from '@/core/components/providers';
import { siteUrl } from '@/core/config/env';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});
const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'NightPass — Tu pase a la noche',
    template: '%s | NightPass',
  },
  description:
    'Descubre los mejores bares y eventos de la noche, suma puntos y compra tus pases con NightPass.',
  applicationName: 'NightPass',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'NightPass',
    locale: 'es_MX',
    url: siteUrl(),
    title: 'NightPass — Tu pase a la noche',
    description:
      'Descubre los mejores bares y eventos de la noche, suma puntos y compra tus pases con NightPass.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NightPass — Tu pase a la noche',
    description:
      'Descubre los mejores bares y eventos de la noche, suma puntos y compra tus pases con NightPass.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
