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

  // --- R2 — Config malicioso no inyecta CSS en el <style> ni en estilos inline ---

  it('R2 — fontFamily malicioso no aparece crudo ni rompe el bloque <style>', () => {
    const evil = document({
      config: {
        primaryColor: '#15AAF2',
        fontFamily: 'x; } body { background: url(https://evil/x) } .a {',
        backgroundColor: '#0a0a0a',
      },
    });
    const html = exportDocumentToHtml(evil);
    // El valor invalido de font-family se reemplaza por el default, no se inyecta crudo.
    expect(html).not.toContain('x; } body { background: url(https://evil/x) } .a {');
    expect(html).toContain('font-family: system-ui, -apple-system, sans-serif');
    // El bloque <style> permanece cerrado (no hay </style> inyectado por el font).
    const styleOpen = (html.match(/<style>/g) ?? []).length;
    const styleClose = (html.match(/<\/style>/g) ?? []).length;
    expect(styleOpen).toBe(styleClose);
  });

  it('R2 — primaryColor/backgroundColor maliciosos no aparecen crudo', () => {
    const evil = document({
      config: {
        primaryColor: 'red; } body { background: url(https://evil/x) } .a {',
        fontFamily: 'Montserrat, sans-serif',
        backgroundColor: 'green; @import url(https://evil/x);',
      },
    });
    const html = exportDocumentToHtml(evil);
    expect(html).not.toContain('red; } body { background: url(https://evil/x) } .a {');
    expect(html).not.toContain('green; @import url(https://evil/x);');
    // primaryColor invalido -> default #15AAF2 (boton). backgroundColor invalido -> default #0a0a0a (body).
    expect(html).toContain('.export-btn {');
    expect(html).toContain('background: #15AAF2');
    expect(html).toContain('body {');
    expect(html).toContain('background: #0a0a0a');
    // fontFamily es valido ('Montserrat, sans-serif'), no se reemplaza por default.
    expect(html).toContain('font-family: Montserrat, sans-serif');
  });

  // --- R3 — Valores del coach usados como tag/atributo sin validar ---

  it('R3 — level malicioso no produce un tag ejecutable (usa default h2)', () => {
    const evil = document({
      sections: [
        {
          id: 'block-1',
          type: 'heading',
          order: 0,
          props: {
            level: 'script>alert(1)<script',
            text: 'Titular inyectado',
          } as any,
        },
      ],
    });
    const html = exportDocumentToHtml(evil);
    // No aparece el payload crudo ni se crea un tag <script>.
    expect(html).not.toContain('script>alert(1)<script');
    expect(html).not.toContain('<script');
    // Se usa el default permitido: h2.
    expect(html).toContain('<h2 class="export-block export-heading');
    expect(html).toContain('Titular inyectado');
  });

  it('R3 — align malicioso no inyecta atributos en style', () => {
    const evil = document({
      sections: [
        {
          id: 'block-1',
          type: 'text',
          order: 0,
          props: {
            body: 'Texto',
            align: 'center" onmouseover="alert(1)',
          } as any,
        },
      ],
    });
    const html = exportDocumentToHtml(evil);
    // No aparece el payload crudo ni el atributo inyectado.
    expect(html).not.toContain('onmouseover');
    expect(html).not.toContain('center" onmouseover');
    // Se usa el default permitido: center.
    expect(html).toContain('text-align:center');
  });

  it('R3 — thickness malicioso no inyecta atributos en el divider', () => {
    const evil = document({
      sections: [
        {
          id: 'block-1',
          type: 'divider',
          order: 0,
          props: {
            style: 'solid',
            thickness: '1px solid" onmouseover="alert(1)',
          } as any,
        },
      ],
    });
    const html = exportDocumentToHtml(evil);
    expect(html).not.toContain('onmouseover');
    expect(html).not.toContain('1px solid" onmouseover');
    // Se usa el default permitido: 1px.
    expect(html).toContain('border-top:1px solid');
  });

  it('R3 — style del divider malicioso no inyecta atributos', () => {
    const evil = document({
      sections: [
        {
          id: 'block-1',
          type: 'divider',
          order: 0,
          props: {
            style: 'solid" onmouseover="alert(1)',
            thickness: '1px',
          } as any,
        },
      ],
    });
    const html = exportDocumentToHtml(evil);
    expect(html).not.toContain('onmouseover');
    expect(html).not.toContain('solid" onmouseover');
    // Se usa el default permitido: solid.
    expect(html).toContain('border-top:1px solid');
  });

});
