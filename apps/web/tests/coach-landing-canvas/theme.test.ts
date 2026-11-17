import {
  safeColor,
  safeFontFamily,
  buildCoachLandingCssVars,
} from '@/features/coach/landing-canvas/utils/block-utils';
import type { CanvasConfig } from '@/features/coach/landing-canvas/types';

const defaults: CanvasConfig = {
  primaryColor: '#15AAF2',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  backgroundColor: '#0a0a0a',
};

describe('safeColor', () => {
  it.each([
    ['#15AAF2', '#15AAF2'],
    ['#fff', '#fff'],
    ['#15aaf2ff', '#15aaf2ff'],
    ['rgb(255, 0, 0)', 'rgb(255, 0, 0)'],
    ['rgba(255, 0, 0, 0.5)', 'rgba(255, 0, 0, 0.5)'],
    ['hsl(120, 100%, 50%)', 'hsl(120, 100%, 50%)'],
    ['hsla(120, 100%, 50%, 0.5)', 'hsla(120, 100%, 50%, 0.5)'],
    ['blue', 'blue'],
  ])('acepta color valido %s y lo devuelve igual', (input, expected) => {
    expect(safeColor(input, '#000000')).toBe(expected);
  });

  it.each([
    ['red!important', '#000000'],
    ['color:red', '#000000'],
    ['</style><script>alert(1)</script>', '#000000'],
    ['', '#000000'],
    [undefined, '#000000'],
  ])('rechaza color invalido y usa el fallback %s', (input, expected) => {
    expect(safeColor(input as string | undefined, '#000000')).toBe(expected);
  });
});

describe('safeFontFamily', () => {
  it.each([
    ['system-ui, -apple-system, sans-serif', 'system-ui, -apple-system, sans-serif'],
    ['"Roboto Mono", monospace', '"Roboto Mono", monospace'],
    ["Montserrat, 'Courier New', monospace", "Montserrat, 'Courier New', monospace"],
    ['Inter, sans-serif', 'Inter, sans-serif'],
  ])('acepta font-family valida %s y la devuelve igual', (input, expected) => {
    expect(safeFontFamily(input, 'system-ui, sans-serif')).toBe(expected);
  });

  it.each([
    ['</style><script>alert(1)</script>', 'system-ui, sans-serif'],
    ['javascript:alert(1)', 'system-ui, sans-serif'],
    ['', 'system-ui, sans-serif'],
    [undefined, 'system-ui, sans-serif'],
    ['A B; DROP TABLE users', 'system-ui, sans-serif'],
    ['Georgia@weird', 'system-ui, sans-serif'],
  ])(
    'rechaza font-family con caracteres no permitidos y cae al default %s',
    (input, expected) => {
      expect(
        safeFontFamily(input as string | undefined, 'system-ui, sans-serif'),
      ).toBe(expected);
    },
  );
});

describe('buildCoachLandingCssVars', () => {
  it('devuelve las 3 variables con los valores sanitizados del config', () => {
    const vars = buildCoachLandingCssVars(defaults) as Record<string, string>;
    expect(vars['--coach-primary']).toBe('#15AAF2');
    expect(vars['--coach-bg']).toBe('#0a0a0a');
    expect(vars['--coach-font']).toBe(
      'system-ui, -apple-system, sans-serif',
    );
  });

  it('aplica fallback cuando el config trae valores invalidos', () => {
    const config: CanvasConfig = {
      primaryColor: 'red!important',
      fontFamily: '</style><script>x</script>',
      backgroundColor: 'bg!123',
    };
    const vars = buildCoachLandingCssVars(config) as Record<string, string>;

    expect(vars['--coach-primary']).not.toBe('red!important');
    expect(vars['--coach-bg']).not.toBe('bg!123');
    expect(vars['--coach-font']).not.toBe('</style><script>x</script>');
    expect(typeof vars['--coach-primary']).toBe('string');
    expect(typeof vars['--coach-bg']).toBe('string');
    expect(typeof vars['--coach-font']).toBe('string');
    // Nunca filtra caracteres peligrosos de font-family ni de color.
    expect(vars['--coach-font']).not.toContain('</style>');
    expect(vars['--coach-font']).not.toContain('<script>');
  });
});
