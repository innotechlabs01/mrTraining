import type { Metadata } from 'next';
import { Inter, Montserrat, JetBrains_Mono } from 'next/font/google';
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
    >
      <body className="font-body bg-surface-0 text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}