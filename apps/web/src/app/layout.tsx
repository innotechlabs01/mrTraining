import type { Metadata } from 'next';
import { Inter, Montserrat, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { ClerkProviderClient } from '@/features/auth/components/ClerkProviderClient';
import { Toaster } from 'sonner';
import './globals.css';

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
    locale: 'en_US',
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
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-body bg-surface-0 text-text-primary antialiased">
        <ClerkProviderClient>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            {children}
            <Toaster position="top-right" richColors theme="dark" />
          </ThemeProvider>
        </ClerkProviderClient>
      </body>
    </html>
  );
}