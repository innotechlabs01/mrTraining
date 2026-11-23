import type { Metadata } from 'next';
import { Inter, Montserrat, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { ClerkProviderClient } from '@/features/auth/components/ClerkProviderClient';
import { NextIntlClientProvider } from 'next-intl';
import { QueryProvider } from '@/features/shared/providers/QueryProvider';
import { Toaster } from 'sonner';
import { getMessages } from '@/lib/messages';
import './globals.css';

const DEFAULT_LOCALE = 'es';

export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mr-training.vercel.app';

export const metadata: Metadata = {
  title: {
    default: 'MR Training — El sistema operativo para entrenamiento deportivo',
    template: '%s | MR Training',
  },
  description:
    'MR Training es la plataforma unificada para coaches y atletas. Programas con IA, analítica de rendimiento, eventos, nutrición y comunicación en equipo.',
  keywords: [
    'plataforma de entrenamiento',
    'software para coaches',
    'gestión de atletas',
    'entrenamiento con IA',
    'analítica de rendimiento',
    'MR Training',
  ],
  authors: [{ name: 'MR Training Inc.' }],
  creator: 'MR Training Inc.',
  publisher: 'MR Training Inc.',
  openGraph: {
    title: 'MR Training — El sistema operativo para entrenamiento deportivo',
    description:
      'MR Training es la plataforma unificada para coaches y atletas. Programas con IA, analítica de rendimiento, eventos, nutrición y comunicación en equipo.',
    type: 'website',
    locale: 'es_ES',
    alternateLocale: ['en_US', 'es_MX', 'es_AR', 'es_ES'],
    url: SITE_URL,
    siteName: 'MR Training',
    images: [
      {
        url: `${SITE_URL}/images/og/og-default.png`,
        width: 1200,
        height: 630,
        alt: 'MR Training — plataforma de entrenamiento deportivo',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MR Training — El sistema operativo para entrenamiento deportivo',
    description:
      'MR Training es la plataforma unificada para coaches y atletas.',
    images: [`${SITE_URL}/images/og/og-default.png`],
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'es-ES': `${SITE_URL}`,
      'es-MX': `${SITE_URL}/es-MX`,
      'es-AR': `${SITE_URL}/es-AR`,
      'en-US': `${SITE_URL}/en-US`,
      en: `${SITE_URL}/en`,
      es: `${SITE_URL}/es`,
    },
  },
  icons: {
    icon: '/images/icon/icon_mr_rp.png',
    shortcut: '/images/icon/icon_mr_rp.png',
    apple: '/images/icon/icon_mr_rp.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = getMessages(DEFAULT_LOCALE);

  return (
    <html
      lang="es"
      className={`${inter.variable} ${montserrat.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-body bg-surface-0 text-text-primary antialiased">
        <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={{ common: messages }}>
          <ClerkProviderClient>
            <QueryProvider>
              <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                {children}
                <Toaster position="top-right" richColors theme="dark" />
              </ThemeProvider>
            </QueryProvider>
          </ClerkProviderClient>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
