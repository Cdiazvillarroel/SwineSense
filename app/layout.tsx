import type { Metadata, Viewport } from 'next';
import { Archivo_Black, Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';

/**
 * Root layout.
 *
 * Loads the three brand fonts defined in the Brand Manual and exposes them
 * as CSS variables so Tailwind's font-* utilities can reference them.
 */

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',                 // Archivo Black has a single weight, labeled 400 internally
  variable: '--font-archivo-black',
  display: 'swap',
});

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SwineSense — AI Farm Operations Assistant',
    template: '%s · SwineSense',
  },
  description:
    'Predictive AI and real-time intelligence for pig farm operations. Detection 72 hours before visible symptoms.',
  applicationName: 'SwineSense',
  authors: [{ name: 'SwineSense' }],
  keywords: ['pig farming', 'swine monitoring', 'AI farm assistant', 'livestock analytics'],
  robots: { index: false, follow: false },   // private app
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0C0E12',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivoBlack.variable} ${barlow.variable} ${barlowCondensed.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-surface text-ink-primary">{children}</body>
    </html>
  );
}
