import type { Metadata } from 'next';

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

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}