import {
  mapCoachLandingDocument,
  mapCoachLandingDocuments,
} from '@/features/coach/landing-canvas/api/mappers';

const baseWire = (overrides: Record<string, unknown> = {}) => ({
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
      id: 'block-1',
      type: 'hero',
      order: 0,
      props: { headline: 'Hola', ctaUrl: '/', ctaLabel: 'Ir' },
    },
  ]),
  images: JSON.stringify([]),
  is_published: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-02T00:00:00Z',
  ...overrides,
});

describe('mapCoachLandingDocument (F1)', () => {
  it('mapea snake_case + JSON strings a documento camelCase ya parseado', () => {
    const doc = mapCoachLandingDocument(baseWire());

    expect(doc.id).toBe('landing-1');
    expect(doc.coachId).toBe('coach-1');
    expect(doc.slug).toBe('mi-landing');
    expect(doc.title).toBe('Mi entrenamiento');
    expect(doc.subtitle).toBe('Entrenamiento personalizado');
    expect(doc.isPublished).toBe(true);
    expect(doc.createdAt).toBe('2026-01-01T00:00:00Z');
    expect(doc.updatedAt).toBe('2026-02-02T00:00:00Z');
    expect(doc.config).toEqual({
      primaryColor: '#15AAF2',
      fontFamily: 'Montserrat, sans-serif',
      backgroundColor: '#0a0a0a',
    });
    expect(Array.isArray(doc.sections)).toBe(true);
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].type).toBe('hero');
    expect(doc.images).toEqual([]);
  });

  it('title y subtitulo nullable devuelven string vacia', () => {
    const doc = mapCoachLandingDocument(
      baseWire({ title: null, subtitle: null }),
    );
    expect(doc.title).toBe('');
    expect(doc.subtitle).toBe('');
  });

  it('config invalido aplica defaults sin lanzar', () => {
    const doc = mapCoachLandingDocument(
      baseWire({ config: '{ not valid json' }),
    );
    expect(doc.config.primaryColor).toBe('#15AAF2');
    expect(typeof doc.config.fontFamily).toBe('string');
  });

  it('sections invalido devuelve array vacio sin lanzar', () => {
    const doc = mapCoachLandingDocument(
      baseWire({ sections: 'definitivamente no es json' }),
    );
    expect(doc.sections).toEqual([]);
  });

  it('is_published falso se mapea a boolean', () => {
    const doc = mapCoachLandingDocument(baseWire({ is_published: false }));
    expect(doc.isPublished).toBe(false);
  });
});

describe('mapCoachLandingDocuments (F1)', () => {
  it('mapea una lista vacia a array vacio', () => {
    expect(mapCoachLandingDocuments([])).toEqual([]);
  });

  it('mapea cada elemento de la lista', () => {
    const docs = mapCoachLandingDocuments([baseWire(), baseWire({ id: 'landing-2' })]);
    expect(docs).toHaveLength(2);
    expect(docs[0].isPublished).toBe(true);
    expect(docs[1].slug).toBe('mi-landing');
  });
});
