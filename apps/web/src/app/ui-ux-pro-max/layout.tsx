import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UI/UX Pro Max — Design Inspection Tool',
  description:
    'Inspect designs. Review with context. Ship faster. UI/UX Pro Max unifies visual review, code inspection, and versioning in one place.',
  openGraph: {
    title: 'UI/UX Pro Max — Design Inspection Tool',
    description:
      'Inspect designs. Review with context. Ship faster.',
    type: 'website',
  },
};

export default function UiUxProMaxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="theme-uiux">{children}</div>;
}
