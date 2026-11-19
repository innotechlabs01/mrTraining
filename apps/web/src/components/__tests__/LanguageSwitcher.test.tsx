import React from 'react';
import { LanguageSwitcher } from '../LanguageSwitcher';

let mockLocale = 'es';
const mockSetLocale = jest.fn();
const mockPush = jest.fn();

jest.mock('@/features/shared/hooks/useI18n', () => ({
  useI18n: () => ({
    locale: mockLocale,
    setLocale: mockSetLocale,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/es/coach',
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockLocale = 'es';
    jest.clearAllMocks();
  });

  it('renders select element with accessible aria-label and options for es', () => {
    mockLocale = 'es';
    const element = LanguageSwitcher();

    expect(element.type).toBe('select');
    expect(element.props['aria-label']).toBe('Seleccionar idioma');
    expect(element.props.className).toContain('focus-visible:ring-brand-primary');
    expect(element.props.value).toBe('es');
  });

  it('renders select element with accessible aria-label for en', () => {
    mockLocale = 'en';
    const element = LanguageSwitcher();

    expect(element.type).toBe('select');
    expect(element.props['aria-label']).toBe('Select language');
    expect(element.props.className).toContain('focus-visible:ring-brand-primary');
    expect(element.props.value).toBe('en');
  });

  it('triggers language change handler properly', () => {
    mockLocale = 'es';
    const element = LanguageSwitcher();
    element.props.onChange({ target: { value: 'en' } } as unknown as React.ChangeEvent<HTMLSelectElement>);

    expect(mockSetLocale).toHaveBeenCalledWith('en');
    expect(mockPush).toHaveBeenCalledWith('/en/coach');
  });
});
