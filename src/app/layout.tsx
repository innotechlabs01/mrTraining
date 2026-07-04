import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'MR TRAINING | ENGINEERED FOR ELITE RESULTS',
  description:
    'Beyond fitness. Beyond aesthetics. We utilize bio-metric telemetry and hybrid coaching to forge a performance-first lifestyle.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark ${montserrat.variable} ${inter.variable}`}>
        <body className="bg-background text-on-surface font-body-md overflow-x-hidden antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
