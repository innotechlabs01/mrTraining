/**
 * Pagina publica de la landing del coach: /l/[slug].
 *
 * Server Component que renderiza el renderer unico CoachLandingBlock (mismo
 * import path que el preview del canvas, garantizando WYSIWYG por D1 y AC2).
 *
 * Corrige B3: consulta ${GO_API}/l/:slug (raiz del Go API, sin /api/v1).
 * No usa dangerouslySetInnerHTML con input del coach (XSS).
 */
import { notFound } from 'next/navigation';
import { CoachLandingBlock } from '@/features/coach/landing-canvas/components/blocks/CoachLandingBlock';
import type { CoachLandingDocument } from '@/features/coach/landing-canvas/types';

interface PublicLandingPageProps {
  params: { slug: string };
}

export default async function PublicLandingPage({
  params,
}: PublicLandingPageProps): Promise<JSX.Element> {
  const baseUrl =
    process.env.NEXT_PUBLIC_GO_API_URL || '';

  // E6: GET /l/:slug en la raiz del Go API (sin /api/v1). Corrige B3.
  const res = await fetch(`${baseUrl}/l/${params.slug}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    notFound();
  }

  const data: CoachLandingDocument = await res.json();

  // Solo landings publicados son visibles al publico
  if (!data.isPublished) {
    notFound();
  }

  const config =
    data.config && typeof data.config === 'object'
      ? data.config
      : typeof data.config === 'string'
        ? JSON.parse(data.config)
        : { primaryColor: '#15AAF2', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#0a0a0a' };

  const sections = Array.isArray(data.sections)
    ? data.sections
    : typeof data.sections === 'string'
      ? JSON.parse(data.sections)
      : [];

  return (
    <html lang="es">
      <head>
        <title>{data.title}</title>
      </head>
      <body>
        <main className="min-h-screen">
          {sections.map((block: CoachLandingDocument['sections'][number]) => (
            <CoachLandingBlock
              key={block.id}
              block={block}
              config={config}
            />
          ))}
        </main>
      </body>
    </html>
  );
}
