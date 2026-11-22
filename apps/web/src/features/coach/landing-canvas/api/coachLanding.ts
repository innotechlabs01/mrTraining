/**
 * Coach Landing API client — endpoints E1-E7 for the coach landing canvas.
 *
 * Consumes the Go API only. No Next.js API Routes are created for data.
 *
 * Endpoints:
 *   E1 GET    /api/v1/coach/landing          -> CoachLandingDocument[]  (lista)
 *   E2 POST   /api/v1/coach/landing          -> CoachLandingDocument
 *   E3 PUT    /api/v1/coach/landing/:id      -> { updated: boolean }
 *   E4 PUT    /api/v1/coach/landing/:id/publish -> { published: boolean }
 *   E5 DELETE /api/v1/coach/landing/:id      -> { deleted: boolean }
 *   E6 GET    /l/:slug                       -> CoachLandingDocument    (publico, sin auth)
 *   E7 POST   /api/v1/landing/media          -> { url: string }
 *
 * Nota: segun el plan, `appresponse.Success` en Go responde `c.JSON(data)`
 * plano (sin envoltorio `{ data: ... }`). Los tipos de respuesta reflejan eso.
 */
import { goFetch } from '@/lib/api/go-client';
import type {
  CoachLandingDocument,
  CoachLandingListItem,
} from '@/features/coach/landing-canvas/types';
import type { CoachLandingWire } from './mappers';
import {
  mapCoachLandingDocument,
  mapCoachLandingDocuments,
  mapCoachLandingListItem,
} from './mappers';

const COACH_LANDING_BASE = '/api/v1/coach/landing';

export interface CreateCoachLandingInput {
  slug: string;
  title: string;
  subtitle: string;
  config: string;
  sections: string;
  images: string;
}

export interface UpdateCoachLandingInput {
  title?: string;
  subtitle?: string;
  config?: string;
  sections?: string;
  images?: string;
}

export interface PublishCoachLandingInput {
  is_published: boolean;
}

export interface UploadLandingMediaResponse {
  url: string;
}

/**
 * E1 — Lista de landings del coach (respuesta: array plano).
 * Mapea el wire format (snake_case + JSON strings) al documento del dominio.
 */
export async function getCoachLandings(): Promise<CoachLandingDocument[]> {
  const raw = await goFetch<CoachLandingWire[]>(COACH_LANDING_BASE, {
    method: 'GET',
    auth: true,
  });
  return mapCoachLandingDocuments(raw);
}

/**
 * E2 — Crea una nueva landing del coach.
 * Mapea el wire format de la respuesta al documento del dominio.
 */
export async function createCoachLanding(
  input: CreateCoachLandingInput,
): Promise<CoachLandingDocument> {
  const raw = await goFetch<CoachLandingWire>(COACH_LANDING_BASE, {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
  return mapCoachLandingDocument(raw);
}

/**
 * E3 — Actualiza parcialmente una landing (body parcial, strings JSON).
 */
export async function updateCoachLanding(
  id: string,
  input: UpdateCoachLandingInput,
): Promise<{ updated: boolean }> {
  return goFetch<{ updated: boolean }>(`${COACH_LANDING_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
    auth: true,
  });
}

/**
 * E4 — Publica / despublica una landing.
 */
export async function publishCoachLanding(
  id: string,
  input: PublishCoachLandingInput,
): Promise<{ published: boolean }> {
  return goFetch<{ published: boolean }>(
    `${COACH_LANDING_BASE}/${id}/publish`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
      auth: true,
    },
  );
}

/**
 * E5 — Elimina una landing del coach.
 */
export async function deleteCoachLanding(id: string): Promise<{ deleted: boolean }> {
  return goFetch<{ deleted: boolean }>(`${COACH_LANDING_BASE}/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}

/**
 * E6 — Obtiene una landing publicada por slug (público, sin auth, raiz del Go API).
 * Se usa tanto en server components (/l/[slug]) como en el cliente cuando
 * se necesita el documento publico sin sesion de coach.
 * Mapea el wire format al documento del dominio.
 */
export async function getPublicCoachLanding(slug: string): Promise<CoachLandingDocument> {
  const raw = await goFetch<CoachLandingWire>(`/l/${slug}`, {
    method: 'GET',
    auth: false,
  });
  return mapCoachLandingDocument(raw);
}

/**
 * E7 — Sube un archivo de media al endpoint existente del landing global.
 * Reutiliza la ruta `/api/v1/landing/media` (ya implementada en Go).
 * No se modifica `features/shared/api/client.ts:951-967`.
 */
export async function uploadLandingMedia(file: File): Promise<UploadLandingMediaResponse> {
  const { uploadMediaToR2 } = await import('@/lib/media/r2-upload');
  const res = await uploadMediaToR2(file, 'coach_landing_media');
  return { url: res.mediaRef };
}

/**
 * Lista simplificada para el seleccionador de landings del canvas.
 * Derivada de E1 (sigue siendo el mismo endpoint, solo se proyecta).
 */
export async function getCoachLandingList(): Promise<CoachLandingListItem[]> {
  const docs = await getCoachLandings();
  return docs.map((d) => mapCoachLandingListItem(d));
}
