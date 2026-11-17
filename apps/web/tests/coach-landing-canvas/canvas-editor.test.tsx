/**
 * Canvas Editor Integration Tests — AC1, AC3, AC4, AC10 (fix round 3)
 *
 * Cierra la brecha del QA: el editor vive detras del auth gate de Clerk, asi que
 * las interacciones reales (agregar bloque, editar, guardar, publicar, exportar)
 * no se pueden verificar a mano. Este archivo las ejercita en jsdom con
 * `createRoot` + `React.act`, sin dependencias nuevas.
 *
 * Que demuestra cada bloque:
 *  - AC1: montaje del editor (paleta con 8 tipos, lienzo, inspector, toolbar).
 *  - F1:  carga desde la API con el wire format real del Go (snake_case + JSON strings).
 *  - AC3/F4: agregar un bloque NO hero desde la paleta y verlo en el preview.
 *  - AC4/F2: editar en el inspector y ver el preview actualizarse sin recargar.
 *  - AC5/F2: guardar guarda el contenido EDITADO (no una copia obsoleta).
 *  - D3: publicar con el body que espera el handler Go ({ is_published: true }).
 *  - AC10: el HTML exportado contiene el contenido editado y sanea URLs.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { CoachLandingCanvas } from '@/features/coach/landing-canvas/components/CoachLandingCanvas';
import { CoachLandingDocumentView } from '@/features/coach/landing-canvas/components/CoachLandingDocumentView';
import { exportDocumentToHtml } from '@/features/coach/landing-canvas/utils/html-export';
import type { CoachLandingDocument } from '@/features/coach/landing-canvas/types';

// React 18 necesita este flag para que act() no emita warnings y funcione bien.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// --- Mocks de librerias de terceros (jsdom no las soporta) ---

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api/go-client', () => ({
  goFetch: (...args: unknown[]) => mockGoFetch(...args),
}));

// URL.createObjectURL no existe en jsdom.
const createObjectURLMock = jest.fn((_blob: Blob) => 'blob:mock');
const revokeObjectURLMock = jest.fn((_url: string) => undefined);
global.URL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL;
global.URL.revokeObjectURL = revokeObjectURLMock as unknown as typeof URL.revokeObjectURL;

// window.confirm no esta implementado en jsdom.
global.confirm = jest.fn(() => true);

// crypto.randomUUID puede no existir en jsdom.
if (typeof global.crypto === 'undefined') {
  global.crypto = {} as Crypto;
}
if (typeof global.crypto.randomUUID === 'undefined') {
  global.crypto.randomUUID = (() =>
    Math.random().toString(36).slice(2)) as unknown as Crypto['randomUUID'];
}

const mockGoFetch = jest.fn();

// --- Helpers ---

/** Wire format real del Go API (apps/api/internal/domain/coach_landing/models.go). */
function createLandingWire(overrides: Record<string, unknown> = {}) {
  return {
    id: 'landing-1',
    coach_id: 'coach-1',
    slug: 'mi-landing',
    title: 'Mi entrenamiento',
    subtitle: 'Entrenamiento personalizado',
    config: JSON.stringify({
      primaryColor: '#15AAF2',
      fontFamily: 'Montserrat, sans-serif',
      backgroundColor: '#0a0a0a',
    }),
    sections: JSON.stringify([
      {
        id: 'block-hero-1',
        type: 'hero',
        order: 0,
        props: {
          headline: 'Titular original',
          subheadline: 'Subtitulo original',
          ctaLabel: 'Comenzar',
          ctaUrl: '/',
        },
      },
    ]),
    images: JSON.stringify([]),
    is_published: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-02-02T00:00:00Z',
    ...overrides,
  };
}

/** Mock por defecto: GET lista, PUT update, PUT publish. */
function installGoApiMock(wire: Record<string, unknown> = createLandingWire()) {
  mockGoFetch.mockImplementation((path: string, options?: { method?: string }) => {
    if (path === '/api/v1/coach/landing' && (!options || options.method === 'GET')) {
      return Promise.resolve([wire]);
    }
    if (
      path.startsWith('/api/v1/coach/landing/') &&
      path.endsWith('/publish') &&
      options?.method === 'PUT'
    ) {
      return Promise.resolve({ published: true });
    }
    if (path === '/api/v1/coach/landing/landing-1' && options?.method === 'PUT') {
      return Promise.resolve({ updated: true });
    }
    if (path === '/api/v1/coach/landing/landing-1' && options?.method === 'DELETE') {
      return Promise.resolve({ deleted: true });
    }
    return Promise.reject(
      new Error(`goFetch no mockeado: ${options?.method ?? 'GET'} ${path}`),
    );
  });
}

/** Monta el editor con createRoot y espera la carga inicial dentro de act(). */
async function renderCanvas(container: HTMLElement): Promise<Root> {
  let root!: Root;
  await act(async () => {
    root = createRoot(container);
    root.render(<CoachLandingCanvas />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await flush();
  return root;
}

/** Deja correr las microtasks/timers pendientes dentro de act(). */
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Setter nativo del elemento (React 18 + jsdom lo necesita para detectar el cambio). */
function nativeValueSetter(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (!setter) {
    throw new Error('No se encontro el setter nativo de value');
  }
  return setter;
}

/** Dispara el evento de React para editar el valor de un input/textarea/select. */
function fireEdit(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const setter = nativeValueSetter(el);
  act(() => {
    setter.call(el, value);
    if (el instanceof HTMLSelectElement) {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}

/** Busca un boton cuyo texto contenga el fragmento dado. */
function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | null {
  for (const btn of Array.from(container.querySelectorAll('button'))) {
    if (btn.textContent?.includes(text)) {
      return btn as HTMLButtonElement;
    }
  }
  return null;
}

/**
 * Busca el control (input/textarea/select) asociado a un label del inspector.
 * Los labels de la feature no usan `htmlFor`, asi que se resuelve por hermano
 * dentro del mismo wrapper `div.space-y-1`.
 */
function findControlByLabel(
  container: HTMLElement,
  labelText: string,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  for (const label of Array.from(container.querySelectorAll('label'))) {
    if (!label.textContent?.includes(labelText)) continue;
    const wrapper = label.parentElement;
    if (!wrapper) continue;
    const control = wrapper.querySelector('input, textarea, select');
    if (control) {
      return control as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    }
  }
  return null;
}

/** Click real (con act) sobre un boton. */
function clickButton(button: HTMLButtonElement | null) {
  if (!button) throw new Error('Boton no encontrado');
  act(() => {
    button.click();
  });
}

/** Click real (con act) sobre el boton de la paleta con el label dado. */
function clickPalette(container: HTMLElement, label: string) {
  const palette = container.querySelector('.coach-palette');
  if (!palette) throw new Error('Paleta no encontrada');
  for (const btn of Array.from(palette.querySelectorAll('button'))) {
    if (btn.textContent?.trim() === label) {
      act(() => {
        (btn as HTMLButtonElement).click();
      });
      return;
    }
  }
  throw new Error(`Boton de paleta "${label}" no encontrado`);
}

/** Lee el contenido de un Blob (jsdom no implementa Blob.text()). */
function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function getPreview(container: HTMLElement): HTMLElement {
  const preview = container.querySelector('.coach-live-preview');
  if (!preview) throw new Error('Preview no encontrado');
  return preview as HTMLElement;
}

function getSectionsFromSaveCall() {
  const putCall = mockGoFetch.mock.calls.find(
    (call) =>
      call[0] === '/api/v1/coach/landing/landing-1' &&
      (call[1] as { method?: string } | undefined)?.method === 'PUT',
  );
  if (!putCall) throw new Error('No se llamo a PUT /api/v1/coach/landing/landing-1');
  const body = JSON.parse((putCall[1] as { body: string }).body) as {
    sections: string;
  };
  return JSON.parse(body.sections) as Array<{
    type: string;
    props: Record<string, string>;
  }>;
}

// --- Suite ---

describe('CoachLandingCanvas — interacciones del editor (AC1, AC3, AC4, AC10)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    jest.clearAllMocks();
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    installGoApiMock();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = await renderCanvas(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('AC1 — Montaje del editor', () => {
    it('monta la paleta con los 8 tipos de bloque', async () => {
      await flush();

      const paletteButtons = Array.from(
        container.querySelectorAll('.coach-palette button'),
      );
      expect(paletteButtons).toHaveLength(8);
      expect(paletteButtons.map((b) => b.textContent?.trim())).toEqual([
        'Hero',
        'Título',
        'Texto',
        'Imagen',
        'Botón',
        'Separador',
        'Redes sociales',
        'Contacto',
      ]);
    });

    it('monta el lienzo con la vista previa, el panel de propiedades y la toolbar', async () => {
      await flush();

      // Lienzo + vista previa
      expect(container.querySelector('.coach-live-preview')).not.toBeNull();
      // Panel de propiedades
      const inspector = container.querySelector('.coach-inspector');
      expect(inspector).not.toBeNull();
      expect(inspector?.textContent).toContain(
        'Selecciona un bloque para editar sus propiedades.',
      );
      // Toolbar: Guardar / Publicar / Exportar HTML
      expect(findButtonByText(container, 'Guardar')).not.toBeNull();
      expect(findButtonByText(container, 'Publicar')).not.toBeNull();
      expect(findButtonByText(container, 'Exportar HTML')).not.toBeNull();
    });
  });

  describe('F1 — Carga desde la API con el wire format real del Go', () => {
    it('mapea snake_case + JSON strings y muestra el hero parseado en el preview', async () => {
      await flush();

      // La API se consume por el cliente de la feature (E1).
      expect(mockGoFetch).toHaveBeenCalledWith(
        '/api/v1/coach/landing',
        expect.objectContaining({ method: 'GET' }),
      );

      const preview = getPreview(container);
      expect(preview.textContent).toContain('Titular original');
      expect(preview.textContent).toContain('Subtitulo original');
      expect(preview.textContent).toContain('Comenzar');
      expect(container.querySelectorAll('.coach-landing-hero')).toHaveLength(1);
    });

    it('el landing no publicado muestra el boton "Publicar" (no "Publicado")', async () => {
      await flush();

      const publishBtn = findButtonByText(container, 'Publicar');
      expect(publishBtn).not.toBeNull();
      expect(publishBtn?.textContent?.trim()).toBe('Publicar');
    });
  });

  describe('AC3 / F4 — Agregar un bloque NO hero desde la paleta', () => {
    it('agrega un bloque de texto al preview y NO agrega un hero', async () => {
      await flush();

      const textBefore = container.querySelectorAll('.coach-landing-text').length;
      const heroBefore = container.querySelectorAll('.coach-landing-hero').length;

      clickPalette(container, 'Texto');

      expect(container.querySelectorAll('.coach-landing-text')).toHaveLength(
        textBefore + 1,
      );
      expect(container.querySelectorAll('.coach-landing-hero')).toHaveLength(
        heroBefore,
      );
    });

    it('el bloque agregado queda seleccionado y su editor aparece en el inspector', async () => {
      await flush();

      clickPalette(container, 'Texto');
      await flush();

      const inspector = container.querySelector('.coach-inspector');
      expect(inspector?.textContent).toContain('Contenido');
      expect(inspector?.textContent).toContain('Cuerpo');
      expect(findControlByLabel(container, 'Cuerpo')).not.toBeNull();
    });

    it('cada tipo de la paleta agrega el bloque del tipo correcto', async () => {
      await flush();

      const expectations: Array<[string, string]> = [
        ['Título', '.coach-landing-heading'],
        ['Texto', '.coach-landing-text'],
        ['Imagen', '.coach-landing-image'],
        ['Botón', '.coach-landing-button'],
        ['Separador', '.coach-landing-divider'],
      ];

      for (const [paletteLabel, selector] of expectations) {
        const before = container.querySelectorAll(selector).length;
        clickPalette(container, paletteLabel);
        await flush();
        expect(container.querySelectorAll(selector)).toHaveLength(before + 1);
      }
    });
  });

  describe('AC4 / F2 — Edicion en vivo desde el inspector', () => {
    it('editar el cuerpo del bloque actualiza el preview sin recargar', async () => {
      await flush();

      clickPalette(container, 'Texto');
      await flush();

      const textarea = findControlByLabel(container, 'Cuerpo') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();
      expect(textarea.value).toBe('Escribe tu contenido aquí.');

      const edited = 'Contenido EDITADO en vivo';
      fireEdit(textarea, edited);

      expect(getPreview(container).textContent).toContain(edited);
      expect(getPreview(container).textContent).not.toContain(
        'Escribe tu contenido aquí.',
      );
    });

    it('la edicion se refleja en el DOM del bloque renderizado (no solo en el texto)', async () => {
      await flush();

      clickPalette(container, 'Texto');
      await flush();

      const textarea = findControlByLabel(container, 'Cuerpo') as HTMLTextAreaElement;
      fireEdit(textarea, 'PARRAFO NUEVO');

      const rendered = container.querySelectorAll('.coach-landing-text');
      const last = rendered[rendered.length - 1];
      expect(last.textContent).toBe('PARRAFO NUEVO');
    });
  });

  describe('AC5 parcial / F2 — Guardar el contenido EDITADO', () => {
    it('Guardar llama PUT /api/v1/coach/landing/<id> con sections que contiene el texto editado', async () => {
      await flush();

      clickPalette(container, 'Texto');
      await flush();

      const textarea = findControlByLabel(container, 'Cuerpo') as HTMLTextAreaElement;
      const edited = 'TEXTO GUARDADO EDITADO';
      fireEdit(textarea, edited);
      await flush();

      clickButton(findButtonByText(container, 'Guardar'));
      await flush();

      expect(mockGoFetch).toHaveBeenCalledWith(
        '/api/v1/coach/landing/landing-1',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining(edited),
        }),
      );

      // sections viaja como JSON string con el texto editado.
      const sections = getSectionsFromSaveCall();
      expect(typeof sections).toBe('object');
      const textBlock = sections.find((s) => s.type === 'text');
      expect(textBlock).toBeDefined();
      expect(textBlock?.props.body).toBe(edited);
      // El hero original se conserva intacto.
      const heroBlock = sections.find((s) => s.type === 'hero');
      expect(heroBlock?.props.headline).toBe('Titular original');
    });

    it('NO guarda la version original del bloque recien agregado', async () => {
      await flush();

      clickPalette(container, 'Texto');
      await flush();

      const textarea = findControlByLabel(container, 'Cuerpo') as HTMLTextAreaElement;
      fireEdit(textarea, 'NUEVO CONTENIDO');
      await flush();

      clickButton(findButtonByText(container, 'Guardar'));
      await flush();

      const sections = getSectionsFromSaveCall();
      const textBlock = sections.find((s) => s.type === 'text');
      expect(textBlock?.props.body).toBe('NUEVO CONTENIDO');
      expect(textBlock?.props.body).not.toBe('Escribe tu contenido aquí.');
    });
  });

  describe('D3 — Publicar', () => {
    it('Publicar llama PUT /api/v1/coach/landing/<id>/publish con { is_published: true }', async () => {
      await flush();

      clickButton(findButtonByText(container, 'Publicar'));
      await flush();

      expect(mockGoFetch).toHaveBeenCalledWith(
        '/api/v1/coach/landing/landing-1/publish',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ is_published: true }),
        }),
      );
    });

    it('tras publicar, el boton pasa a "Publicado"', async () => {
      await flush();

      clickButton(findButtonByText(container, 'Publicar'));
      await flush();

      expect(findButtonByText(container, 'Publicado')).not.toBeNull();
    });

    it('publicar no descarta las ediciones pendientes del preview', async () => {
      await flush();

      clickPalette(container, 'Texto');
      await flush();

      const textarea = findControlByLabel(container, 'Cuerpo') as HTMLTextAreaElement;
      fireEdit(textarea, 'EDICION QUE DEBE SOBREVIVIR A PUBLICAR');
      await flush();

      clickButton(findButtonByText(container, 'Publicar'));
      await flush();

      expect(getPreview(container).textContent).toContain(
        'EDICION QUE DEBE SOBREVIVIR A PUBLICAR',
      );
    });
  });

  describe('AC10 — Exportar HTML', () => {
    it('Exportar HTML abre el dialogo con el HTML del documento EDITADO', async () => {
      await flush();

      clickPalette(container, 'Texto');
      await flush();

      const textarea = findControlByLabel(container, 'Cuerpo') as HTMLTextAreaElement;
      const edited = 'CONTENIDO EXPORTADO';
      fireEdit(textarea, edited);
      await flush();

      clickButton(findButtonByText(container, 'Exportar HTML'));
      await flush();

      // El dialogo de exportacion debe quedar visible.
      const downloadBtn = findButtonByText(container, 'Descargar');
      expect(downloadBtn).not.toBeNull();
      expect(downloadBtn?.textContent).toContain('mi-landing.html');

      // Al descargar, el blob debe contener el HTML con el contenido editado.
      const anchorClickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
      clickButton(downloadBtn);
      await flush();

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blob = createObjectURLMock.mock.calls[0][0];
      const html = await readBlobText(blob);
      expect(html).toContain(edited);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock');

      anchorClickSpy.mockRestore();
    });

    it('el HTML exportado no contiene javascript: si el CTA tiene una URL maliciosa', async () => {
      const wire = createLandingWire({
        sections: JSON.stringify([
          {
            id: 'block-hero-1',
            type: 'hero',
            order: 0,
            props: {
              headline: 'Titular original',
              subheadline: 'Subtitulo original',
              ctaLabel: 'Comenzar',
              ctaUrl: 'javascript:alert(document.cookie)',
            },
          },
        ]),
      });
      act(() => {
        root.unmount();
      });
      installGoApiMock(wire);
      root = await renderCanvas(container);
      await flush();

      clickPalette(container, 'Texto');
      await flush();

      const textarea = findControlByLabel(container, 'Cuerpo') as HTMLTextAreaElement;
      fireEdit(textarea, 'CONTENIDO EDITADO CON CTA MALICIOSO');
      await flush();

      clickButton(findButtonByText(container, 'Exportar HTML'));
      await flush();

      const downloadBtn = findButtonByText(container, 'Descargar');
      expect(downloadBtn).not.toBeNull();

      const anchorClickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
      clickButton(downloadBtn);
      await flush();

      const blob = createObjectURLMock.mock.calls[0][0];
      const html = await readBlobText(blob);
      expect(html).toContain('CONTENIDO EDITADO CON CTA MALICIOSO');
      expect(html).not.toContain('href="javascript:');
      expect(html).toContain('href="#"');

      anchorClickSpy.mockRestore();
    });

    it('exportDocumentToHtml escapa el title y no emite javascript: (unitario del export)', () => {
      const doc: CoachLandingDocument = {
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
              backgroundColor: undefined,
              textColor: undefined,
              padding: undefined,
              marginBottom: undefined,
              width: undefined,
              align: undefined,
              mediaUrl: undefined,
              mediaAlt: undefined,
            },
          },
        ],
        images: [],
        isPublished: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-02T00:00:00Z',
      };

      const html = exportDocumentToHtml(doc);

      expect(html).not.toContain('<script>alert(1)</script>');
      // El title va escapado: el markup inyectado queda inerte.
      expect(html).toContain(
        'Mi ' + '&' + 'lt;script' + '&' + 'gt;alert(1)' + '&' + 'lt;/script' + '&' + 'gt; entrenamiento',
      );
      expect(html).not.toContain('href="javascript:');
      expect(html).toContain('href="#"');
    });
  });

  describe('F16 — Seleccion de bloques en el canvas', () => {
    async function remountWithWire(wire: Record<string, unknown>): Promise<void> {
      act(() => {
        root.unmount();
      });
      installGoApiMock(wire);
      root = await renderCanvas(container);
    }

    it('clickear un bloque selecciona ese bloque y sus acciones Subir/Bajar/Eliminar lo usan', async () => {
      const wire = createLandingWire({
        sections: JSON.stringify([
          {
            id: 'block-hero-1',
            type: 'hero',
            order: 0,
            props: {
              headline: 'Titular original',
              subheadline: 'Subtitulo original',
              ctaLabel: 'Comenzar',
              ctaUrl: '/',
            },
          },
          {
            id: 'block-heading-1',
            type: 'heading',
            order: 1,
            props: {
              level: 'h2',
              text: 'Titular seleccionable',
            },
          },
        ]),
      });
      await remountWithWire(wire);
      await flush();

      const preview = getPreview(container);
      const heading = preview.querySelector('.coach-landing-heading') as HTMLElement | null;
      expect(heading).not.toBeNull();

      act(() => {
        heading?.click();
      });
      await flush();

      const inspector = container.querySelector('.coach-inspector');
      expect(findControlByLabel(inspector as HTMLElement, 'Nivel')).not.toBeNull();
      expect(
        Array.from(inspector?.querySelectorAll('input') ?? []).some(
          (input) => input.value === 'Titular seleccionable',
        ),
      ).toBe(true);
      expect(heading?.classList.contains('coach-landing-block-selected')).toBe(true);

      // Clickear el bloque ya seleccionado no lo deselecciona.
      act(() => {
        heading?.click();
      });
      await flush();
      expect(container.querySelector('.coach-inspector')?.textContent).toContain(
        'Nivel',
      );

      const upButton = container.querySelector(
        'button[title="Subir"]',
      ) as HTMLButtonElement | null;
      const downButton = container.querySelector(
        'button[title="Bajar"]',
      ) as HTMLButtonElement | null;
      const deleteButton = container.querySelector(
        'button[title="Eliminar"]',
      ) as HTMLButtonElement | null;
      expect(upButton).not.toBeNull();
      expect(downButton).not.toBeNull();
      expect(deleteButton).not.toBeNull();

      clickButton(upButton);
      await flush();
      const page = preview.querySelector('.coach-landing-page');
      expect(page?.children[0]?.classList.contains('coach-landing-heading')).toBe(
        true,
      );

      clickButton(downButton);
      await flush();
      expect(page?.children[0]?.classList.contains('coach-landing-hero')).toBe(
        true,
      );

      clickButton(deleteButton);
      await flush();
      expect(preview.querySelector('.coach-landing-heading')).toBeNull();
      expect(container.querySelector('.coach-inspector')?.textContent).toContain(
        'Selecciona un bloque para editar sus propiedades.',
      );
    });

    it('mantiene exactamente el markup publico cuando no hay props de interaccion', () => {
      const sections: CoachLandingDocument['sections'] = [
        {
          id: 'block-text-1',
          type: 'text',
          order: 0,
          props: {
            body: 'Cuerpo publico',
          },
        },
      ];

      const markup = renderToStaticMarkup(
        <CoachLandingDocumentView
          sections={sections}
          config={{
            primaryColor: '#15AAF2',
            fontFamily: 'Montserrat, sans-serif',
            backgroundColor: '#0a0a0a',
          }}
        />,
      );

      expect(markup).toBe(
        '<main class="coach-landing-page" style="--coach-primary:#15AAF2;--coach-bg:#0a0a0a;--coach-font:Montserrat, sans-serif"><div class="coach-landing-text">Cuerpo publico</div></main>',
      );
      expect(markup).not.toContain('tabindex');
      expect(markup).not.toContain('role="button"');
      expect(markup).not.toContain('coach-landing-block-selectable');
      expect(markup).not.toContain('coach-landing-block-selected');
    });

    it('selecciona un bloque con enlace sin ejecutar la navegacion del href', async () => {
      const wire = createLandingWire({
        sections: JSON.stringify([
          {
            id: 'block-button-1',
            type: 'button',
            order: 0,
            props: {
              label: 'Boton enlazado',
              url: '#no-navigation',
              variant: 'primary',
              size: 'md',
            },
          },
        ]),
      });
      await remountWithWire(wire);
      await flush();

      const preview = getPreview(container);
      const link = preview.querySelector('a.coach-landing-button');
      expect(link).not.toBeNull();
      const initialHash = window.location.hash;
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      act(() => {
        link?.dispatchEvent(clickEvent);
      });
      await flush();

      expect(clickEvent.defaultPrevented).toBe(true);
      expect(window.location.hash).toBe(initialHash);
      expect(findControlByLabel(container, 'Etiqueta')).not.toBeNull();
    });

    it('permite seleccionar bloques con Enter y Espacio desde el teclado', async () => {
      const wire = createLandingWire({
        sections: JSON.stringify([
          {
            id: 'block-heading-1',
            type: 'heading',
            order: 0,
            props: {
              level: 'h2',
              text: 'Titular por teclado',
            },
          },
        ]),
      });
      await remountWithWire(wire);
      await flush();

      const heading = getPreview(container).querySelector(
        '.coach-landing-heading',
      );
      expect(heading).not.toBeNull();

      act(() => {
        heading?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await flush();
      expect(findControlByLabel(container, 'Nivel')).not.toBeNull();

      clickButton(findButtonByText(container, 'Deseleccionar'));
      await flush();
      expect(container.querySelector('.coach-inspector')?.textContent).toContain(
        'Selecciona un bloque para editar sus propiedades.',
      );

      act(() => {
        heading?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: ' ',
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await flush();
      expect(findControlByLabel(container, 'Nivel')).not.toBeNull();
      expect(heading?.classList.contains('coach-landing-block-selected')).toBe(true);
    });

    it('hace seleccionables los ocho tipos de bloque del canvas', async () => {
      const wire = createLandingWire({
        sections: JSON.stringify([
          {
            id: 'block-hero-1',
            type: 'hero',
            order: 0,
            props: {
              headline: 'Hero',
              subheadline: 'Subtitulo',
              ctaLabel: 'Comenzar',
              ctaUrl: '/',
            },
          },
          {
            id: 'block-heading-1',
            type: 'heading',
            order: 1,
            props: { level: 'h2', text: 'Titulo' },
          },
          {
            id: 'block-text-1',
            type: 'text',
            order: 2,
            props: { body: 'Texto' },
          },
          {
            id: 'block-image-1',
            type: 'image',
            order: 3,
            props: { src: '/imagen.jpg', alt: 'Imagen' },
          },
          {
            id: 'block-button-1',
            type: 'button',
            order: 4,
            props: {
              label: 'Boton',
              url: '/',
              variant: 'primary',
              size: 'md',
            },
          },
          {
            id: 'block-divider-1',
            type: 'divider',
            order: 5,
            props: { style: 'solid', thickness: '1px' },
          },
          {
            id: 'block-social-links-1',
            type: 'social-links',
            order: 6,
            props: {
              links: [{ label: 'Instagram', url: 'https://instagram.com' }],
            },
          },
          {
            id: 'block-contact-1',
            type: 'contact',
            order: 7,
            props: {
              email: 'coach@example.com',
              socialLinks: [],
            },
          },
        ]),
      });
      await remountWithWire(wire);
      await flush();

      const selectableBlocks = Array.from(
        getPreview(container).querySelectorAll<HTMLElement>(
          '.coach-landing-block-selectable',
        ),
      );
      expect(selectableBlocks).toHaveLength(8);

      for (const blockElement of selectableBlocks) {
        act(() => {
          blockElement.click();
        });
        await flush();
        expect(blockElement.classList.contains('coach-landing-block-selected')).toBe(
          true,
        );
      }
    });
  });
});
