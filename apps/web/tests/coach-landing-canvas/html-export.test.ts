import { exportDocumentToHtml } from '@/features/coach/landing-canvas/utils/html-export';
import type { CoachLandingDocument } from '@/features/coach/landing-canvas/types';

const document = (overrides: Partial<CoachLandingDocument> = {}): CoachLandingDocument => ({
  id: 'landing-1',
  coachId: 'coach-1',
  slug: 'mi-landing',
  title: 'Mi <script>alert(1)</script> entrenamiento',
  subtitle: 'Subtitulo',
  config: {
    primaryColor: '#15AAF2',
    fontFamily: 'Montserrat, sans-serif',
    backgroundColor: '#0a0a0a',
  },
  sections: [
    {
      id: 'block-1',
      type: 'hero',
      order: 0,
      props: {
        headline: 'Titular seguro',
        subheadline: 'Sub <b>texto</b>',
        ctaLabel: 'Ir',
        ctaUrl: 'javascript:alert(document.cookie)',
      },
    },
    {
      id: 'block-2',
      type: 'button',
      order: 1,
      props: {
        label: 'Boton',
        url: 'data:text/html,<script>alert(1)</script>',
        variant: 'primary',
        size: 'md',
      },
    },
  ],
  images: [],
  isPublished: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-02T00:00:00Z',
  ...overrides,
});

describe('exportDocumentToHtml (F7, F8)', () => {
  it('escapa <script> en texto del documento', () => {
    const html = exportDocumentToHtml(document());
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('Mi &lt;script&gt;alert(1)&lt;/script&gt; entrenamiento');
  });

  it('no permite romper </style> via fontFamily ni color', () => {
    const evil = document({
      config: {
        primaryColor: '</style><script>alert(1)</script>',
        fontFamily: '</style><script>alert(2)</script>',
        backgroundColor: '#0a0a0a',
      },
    });
    const html = exportDocumentToHtml(evil);
    // El valor invalido de color se rechaza (safeColor) y no aparece tal cual
    expect(html).not.toContain('</style><script>');
    // fontFamily invalido se escapa para que no rompa el bloque <style>
    expect(html).not.toContain('</style><script>');
  });

  it('javascript: y data: no aparecen en los href exportados', () => {
    const html = exportDocumentToHtml(document());
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="data:');
    // Se sustituyen por '#'
    expect(html).toContain('href="#"');
  });
});
