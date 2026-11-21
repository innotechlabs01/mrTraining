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

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  is_active: boolean;
  coach_id: string;
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

/** Obtiene los planes publicados de un coach para la pagina publica.
 *  Endpoint publico (sin auth), fuera de /api/v1. Nunca bloquea la landing:
 *  ante cualquier error devuelve [].
 */
const getPublicPlans = cache(async (coachId: string): Promise<Plan[]> => {
  if (!coachId) return [];
  const baseUrl = process.env.NEXT_PUBLIC_GO_API_URL || '';
  try {
    const res = await fetch(`${baseUrl}/public/coaches/${coachId}/plans`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const raw = await res.json();
    const data = (raw as { data?: Plan[] })?.data ?? [];
    return data.filter((p) => p.is_active);
  } catch {
    return [];
  }
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

  // Planes publicados del coach (opcionales: no bloquean la landing)
  const plans = await getPublicPlans(document.coachId);

  return (
    <>
      <CoachLandingDocumentView sections={sections} config={config} />
      {plans.length > 0 && (
        <section className="coach-landing-plans">
          <h2 className="coach-landing-plans-title">Planes disponibles</h2>
          <div className="coach-landing-plans-grid">
            {plans.map((plan) => (
              <article key={plan.id} className="coach-landing-plan-card">
                <h3 className="coach-landing-plan-name">{plan.name}</h3>
                {plan.description && (
                  <p className="coach-landing-plan-description">
                    {plan.description}
                  </p>
                )}
                <p className="coach-landing-plan-price">
                  {plan.price.toFixed(2)} {plan.currency} /
                  {plan.billing_period === 'annual' ? 'año' : 'mes'}
                </p>
                <a
                  href={`/checkout?planId=${plan.id}`}
                  className="coach-landing-plan-cta"
                >
                  Suscribirse
                </a>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
