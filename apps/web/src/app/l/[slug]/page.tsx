/**
 * Pagina publica de la landing del coach: /l/[slug].
 *
 * Server Component que renderiza CoachLandingDocumentView (el mismo
 * componente compartido que usa el preview del canvas), garantizando WYSIWYG
 * real entre preview y pagina publicada (F12, F13).
 *
 * Consulta ${GO_API}/l/:slug (raiz del Go API, sin /api/v1) y mapea el wire
 * format (snake_case + JSON strings) al documento del dominio mediante el
 * mapper de la feature (misma logica que el editor).
 *
 * generateMetadata y el cuerpo comparten el fetch memoizado con cache() de
 * React, asi solo se hace un request al Go API por visita (F15).
 *
 * No usa dangerouslySetInnerHTML con input del coach (XSS).
 * No renderiza <html>/<head>/<body>: el root layout ya los provee.
 */
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { CoachLandingDocumentView } from '@/features/coach/landing-canvas/components/CoachLandingDocumentView';
import type { CoachLandingDocument } from '@/features/coach/landing-canvas/types';
import { mapCoachLandingDocument, type CoachLandingWire } from '@/features/coach/landing-canvas';
import '@/features/coach/landing-canvas/styles/coach-landing.css';

interface PublicLandingPageProps {
  params: { slug: string };
}

const getPublicLanding = cache(async (slug: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_GO_API_URL || '';
  const res = await fetch(`${baseUrl}/l/${slug}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    return null;
  }
  const raw = await res.json();
  return mapCoachLandingDocument(raw as CoachLandingWire);
});

export async function generateMetadata({
  params,
}: PublicLandingPageProps): Promise<{ title: string }> {
  const doc = await getPublicLanding(params.slug);
  if (!doc) {
    return { title: 'Landing no encontrada | MR Training' };
  }
  return { title: `${doc.title} | MR Training` };
}

export default async function PublicLandingPage({
  params,
}: PublicLandingPageProps): Promise<JSX.Element> {
  const document: CoachLandingDocument | null = await getPublicLanding(
    params.slug,
  );

  if (!document) {
    notFound();
  }

  // Solo landings publicados son visibles al publico
  if (!document.isPublished) {
    notFound();
  }

  const { sections, config } = document;

  return <CoachLandingDocumentView sections={sections} config={config} />;
}
