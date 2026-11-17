/**
 * Mapper entre el wire format del Go API (snake_case, config/sections/images
 * como strings JSON) y el `CoachLandingDocument` del dominio frontend
 * (camelCase, objetos ya parseados).
 *
 * El Go API serializa `config`, `sections` e `images` como JSON **string**
 * y usa `snake_case` para todos los campos (`coach_id`, `is_published`,
 * `created_at`, `updated_at`). Este mapper es la única capa que conoce el
 * wire format; el resto de la feature trabaja siempre con el documento
 * camelCase ya parseado.
 */
import type {
  CoachLandingDocument,
  CoachLandingListItem,
  CanvasConfig,
  CoachLandingBlock,
} from '@/features/coach/landing-canvas/types';
import { defaultCanvasConfig } from '@/features/coach/landing-canvas/utils/block-utils';

/**
 * Wire format tal como lo devuelve el Go API: snake_case y los campos
 * grandes como strings JSON (o ya parseados por el cliente HTTP).
 */
export interface CoachLandingWire {
  id: string;
  coach_id: string;
  slug: string;
  title?: string | null;
  subtitle?: string | null;
  config: string | CanvasConfig;
  sections: string | CoachLandingBlock[];
  images: string | ImageAssetWire[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface ImageAssetWire {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

/**
 * Parsea un JSON string de forma segura. Nunca lanza: ante JSON invalido
 * devuelve el `fallback` provisto.
 */
function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || raw === '') {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Normaliza `config`: si falta o es invalido, aplica el config por defecto.
 * Si ya es objeto, lo usa tal cual (pero con fallback por campo por si falta alguno).
 */
function normalizeConfig(raw: string | CanvasConfig | undefined): CanvasConfig {
  const parsed =
    typeof raw === 'string'
      ? safeJsonParse<CanvasConfig>(raw, defaultCanvasConfig())
      : raw ?? defaultCanvasConfig();
  return {
    primaryColor: parsed.primaryColor ?? defaultCanvasConfig().primaryColor,
    fontFamily: parsed.fontFamily ?? defaultCanvasConfig().fontFamily,
    backgroundColor: parsed.backgroundColor ?? defaultCanvasConfig().backgroundColor,
  };
}

/**
 * Normaliza `sections`: array o [] si falta/invalido.
 */
function normalizeSections(raw: string | CoachLandingBlock[] | undefined): CoachLandingBlock[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  return safeJsonParse<CoachLandingBlock[]>(raw, []);
}

/**
 * Normaliza `images`: array o [] si falta/invalido.
 */
function normalizeImages(
  raw: string | ImageAssetWire[] | undefined,
): ImageAssetWire[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  return safeJsonParse<ImageAssetWire[]>(raw, []);
}

/**
 * Mapea un registro crudo del wire format a `CoachLandingDocument`.
 */
export function mapCoachLandingDocument(raw: CoachLandingWire): CoachLandingDocument {
  return {
    id: raw.id ?? '',
    coachId: raw.coach_id ?? '',
    slug: raw.slug ?? '',
    title: raw.title ?? '',
    subtitle: raw.subtitle ?? '',
    config: normalizeConfig(raw.config),
    sections: normalizeSections(raw.sections),
    images: normalizeImages(raw.images),
    isPublished: Boolean(raw.is_published),
    createdAt: raw.created_at ?? '',
    updatedAt: raw.updated_at ?? '',
  };
}

/**
 * Mapea una lista de registros crudos del wire format.
 */
export function mapCoachLandingDocuments(raw: CoachLandingWire[]): CoachLandingDocument[] {
  return raw.map((item) => mapCoachLandingDocument(item));
}

/**
 * Proyecta un documento mapeado a `CoachLandingListItem` (usado por el
 * seleccionador de landings del canvas).
 */
export function mapCoachLandingListItem(doc: CoachLandingDocument): CoachLandingListItem {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    subtitle: doc.subtitle,
    isPublished: doc.isPublished,
    updatedAt: doc.updatedAt,
  };
}
