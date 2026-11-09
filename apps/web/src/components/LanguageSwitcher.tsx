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
    <select value={locale} onChange={(e) => switchLang(e.target.value as 'es' | 'en')} className="px-2 py-1 border rounded bg-white text-sm">
      {['es', 'en'].map((l) => (
        <option key={l} value={l}>
          {l === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
        </option>
      ))}
    </select>
  );
}
