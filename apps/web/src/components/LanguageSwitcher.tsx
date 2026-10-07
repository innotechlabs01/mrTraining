'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { SUPPORTED_LANGS } from '@/config/languages';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLang = (code: string) => {
    const newPath = pathname.replace(`/${locale}/`, `/${code}/`);
    router.push(newPath);
  };

  return (
    <select value={locale} onChange={(e) => switchLang(e.target.value)} className="px-2 py-1 border rounded bg-white text-sm">
      {SUPPORTED_LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}