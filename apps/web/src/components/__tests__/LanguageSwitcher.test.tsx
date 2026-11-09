import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { LanguageSwitcher } from '../LanguageSwitcher';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/es/landing',
}));

jest.mock('@/features/shared/hooks/useI18n', () => ({
  useI18n: () => ({
    locale: 'es',
    setLocale: jest.fn(),
    t: (key: string) => key,
  }),
}));

describe('LanguageSwitcher accessibility', () => {
  it('renders select element with accessible aria-label and options', () => {
    const html = ReactDOMServer.renderToString(<LanguageSwitcher />);

    // Verify aria-label is present on select
    expect(html).toContain('aria-label="Seleccionar idioma / Select language"');

    // Verify accessible focus visible ring styling
    expect(html).toContain('focus-visible:ring-2');

    // Verify Spanish and English options
    expect(html).toContain('value="es"');
    expect(html).toContain('🇪🇸 Español');
    expect(html).toContain('value="en"');
    expect(html).toContain('🇺🇸 English');
  });
});
