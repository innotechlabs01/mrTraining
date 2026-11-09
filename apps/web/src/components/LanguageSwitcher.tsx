'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@/features/shared/hooks/useI18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const switchLang = (code: 'es' | 'en') => {
    setLocale(code);
    const newPath = pathname.replace(`/${locale}/`, `/${code}/`);
    router.push(newPath);
  };

  const label = locale === 'es' ? 'Seleccionar idioma' : 'Select language';

  return (
    <select
      value={locale}
      aria-label={label}
      onChange={(e) => switchLang(e.target.value as 'es' | 'en')}
      className="px-2.5 py-1 text-sm border border-surface-3 rounded-lg bg-surface-1 text-text-primary hover:border-brand-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary cursor-pointer transition-colors"
    >
      {['es', 'en'].map((l) => (
        <option key={l} value={l} className="bg-surface-1 text-text-primary">
          {l === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
        </option>
      ))}
    </select>
  );
}
