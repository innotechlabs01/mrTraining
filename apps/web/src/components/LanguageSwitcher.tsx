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

  return (
    <select
      aria-label="Seleccionar idioma / Select language"
      value={locale}
      onChange={(e) => switchLang(e.target.value as 'es' | 'en')}
      className="px-2.5 py-1 text-sm rounded-md border border-[var(--border,#e5e7eb)] bg-white text-gray-800 shadow-sm transition-colors cursor-pointer hover:border-gray-400 focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
    >
      <option value="es">🇪🇸 Español</option>
      <option value="en">🇺🇸 English</option>
    </select>
  );
}
