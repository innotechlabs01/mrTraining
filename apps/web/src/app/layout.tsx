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

export const metadata: Metadata = {
  title: {
    default: 'MR Training — Unified Coaching Platform',
    template: '%s | MR Training',
  },
  description:
    'The unified coaching platform for modern coaches and their athletes. AI-powered programs, performance analytics, events, nutrition, and team communication.',
  keywords: [
    'coaching platform',
    'training software',
    'athlete management',
    'AI coaching',
    'performance analytics',
  ],
  openGraph: {
    title: 'MR Training — Unified Coaching Platform',
    description:
      'The unified coaching platform for modern coaches and their athletes.',
    type: 'website',
    locale: 'es_US',
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
