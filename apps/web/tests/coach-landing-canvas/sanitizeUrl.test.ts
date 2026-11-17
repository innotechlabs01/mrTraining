import { sanitizeUrl } from '@/features/coach/landing-canvas/utils/block-utils';

describe('sanitizeUrl (F8)', () => {
  it.each([
    ['https://example.com', 'https://example.com'],
    ['http://example.com', 'http://example.com'],
    ['mailto:coach@example.com', 'mailto:coach@example.com'],
    ['tel:+573000000000', 'tel:+573000000000'],
    ['/l/mi-landing', '/l/mi-landing'],
    ['#seccion', '#seccion'],
    ['./img.png', './img.png'],
    ['../relative.png', '../relative.png'],
  ])('permite %s', (input, expected) => {
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it.each([
    ['javascript:alert(1)', '#'],
    ['javascript:alert(document.cookie)', '#'],
    ['data:text/html,<script>alert(1)</script>', '#'],
    ['vbscript:msgbox(1)', '#'],
    ['FILE:///etc/passwd', '#'],
    ['', '#'],
    ['   ', '#'],
  ])('rechaza %s y devuelve #', (input, expected) => {
    expect(sanitizeUrl(input)).toBe(expected);
  });
});
