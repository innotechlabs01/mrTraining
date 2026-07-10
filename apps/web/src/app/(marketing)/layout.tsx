import { LanguageProvider } from '@/components/landing/i18n';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
