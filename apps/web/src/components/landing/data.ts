export type LandingStat = { value: string; label: string };
export type LandingReason = { n: string; title: string; copy: string };
export type LandingTestimonial = { quote: string; name: string; seed: string; photo?: string };
export type LandingTrainer = { name: string; seed: string; photo?: string };

export type LandingContact = {
  whatsapp: string;
  email: string;
  city: string;
  socialLinks: { label: string; href: string; icon: string }[];
};

export type LandingBrand = {
  colors: { primary: string };
  font?: string;
  heroSubtitle: string;
  heroMedia?: string; // uploaded image or video URL — takes precedence over heroPhoto
  heroPhoto: string;
  heroPhotoAlt: string;
  aboutTitle: string;
  aboutPhoto: string;
  aboutPhotoAlt: string;
  aboutCopy: string[];
  contact: LandingContact;
};

export interface LandingData {
  version: number;
  navLinks: string[];
  brand: LandingBrand;
  stats: LandingStat[];
  reasons: LandingReason[];
  trainers?: LandingTrainer[];
  testimonials: LandingTestimonial[];
  tienda: { title: string; copy: string };
  blog: { title: string; subtitle: string };
  plans: { title: string; subtitle: string };
  asesoria: { title: string; subtitle: string };
  updatedAt: string;
}

export type Product = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category?: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  content?: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  coachName?: string;
  coachAvatarUrl?: string | null;
};

export type Plan = {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  billingPeriod?: string;
  features?: string[];
};

export const FALLBACK_BRAND_ACCENT = '#15aaf2';

// Client-safe copy of the shipped defaults from @/lib/landing — used by `pick`
// to decide between coach edits and the i18n catalog.
export const FALLBACK_HERO_TAGLINE =
  'Transforma tu fuerza en disciplina, tu disciplina en resultado.';

export const FALLBACK_STATS: LandingStat[] = [
  { value: '12K+', label: 'Horas de Entrenamiento' },
  { value: '8+', label: 'Años de Experiencia' },
  { value: '300+', label: 'Atletas Transformados' },
];

export const FALLBACK_REASONS: LandingReason[] = [
  { n: '01', title: 'Programación a Medida', copy: 'Cada plan se escribe para ti: objetivos, historial, horarios y limitaciones. Sin plantillas compartidas.' },
  { n: '02', title: 'Feedback en Tiempo Real', copy: 'Revisamos tus sesiones vía video, ajustamos cargas y corregimos técnica cada semana. No entrenas en soledad.' },
  { n: '03', title: 'Seguimiento Nutricional', copy: 'Macros claros, sin restricciones extrema. Planes que caben en tu rutina, no en un libro de cocina.' },
  { n: '04', title: 'Comunidad de Resultados', copy: 'Únete a una comunidad privada de atletas que ya transformaron su cuerpo y comparten tips cada día.' },
];

export const FALLBACK_TESTIMONIALS: LandingTestimonial[] = [
  { quote: 'En 12 semanas subí 18 kg a mi press de banca y aprendí a comer sin pasar hambre. La claridad de Mao sobre progresión real es brutal.', name: 'Andrés R.', seed: 'ig-testi-1' },
  { quote: 'Vine sin saber levantar una pesa. Ahora marqué mi primera competencia de powerlifting y Mao marcó 1º lugar en mi categoría.', name: 'Valeria M.', seed: 'ig-testi-2' },
  { quote: 'La diferencia es que Mao no te deja fallar. Si una semana te fue mal, ya es lunes y ajusta todo. Eso da resultados.', name: 'Luis F.', seed: 'ig-testi-3' },
];

export const FALLBACK_ABOUT = {
  eyebrow: 'Sobre Mao Restrepo',
  photoAlt: 'Mao entrenando a un atleta',
  copy: [
    'Soy Mao Restrepo — entrenador online con más de 8 años de experiencia preparando atletas para fuerza, resistencia y transformación física.',
    'Mi filosofía no se basa en dietas mágicas ni ejercicios viralizados. Se trata de un sistema simple: progresión constante, feedback honesto y un plan que se adapta a tu vida real.',
    'Trabajo con clientes de todo nivel: desde principiantes absolutos hasta atletas competitivos. Lo que todos comparten es un plan a medida — nunca uno-size-fits-all — y una comunicación directa vía WhatsApp para que nunca estés solo en el proceso.',
  ],
};

/**
 * Localization strategy for coach-editable content:
 * content stored in the DB that still equals the shipped default is treated as
 * unedited and rendered from the i18n catalog; anything the coach customized
 * wins over the translation.
 */
export function pick(dbValue: string | undefined, fallbackDefault: string | undefined, localized: string): string {
  if (dbValue && dbValue !== fallbackDefault) return dbValue;
  return localized;
}

export function pickItem<T>(dbValue: T | undefined, fallbackDefault: T | undefined, localized: T): T {
  if (dbValue !== undefined && dbValue !== fallbackDefault) return dbValue;
  return localized;
}

import { goFetch } from '@/lib/api/go-client';

export async function fetchLanding(): Promise<LandingData | null> {
  // Go API is the source of truth; Next route is the legacy fallback.
  try {
    const r = await goFetch<LandingData>('/public/landing', { auth: false });
    if (r && r.brand) return r;
  } catch {
    /* fall through to legacy */
  }
  try {
    const res = await fetch('/api/landing');
    if (!res.ok) return null;
    return (await res.json()) as LandingData;
  } catch {
    return null;
  }
}

/** True for uploaded/remote video assets (used to render <video> in the hero). */
export function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|mov|webm)(\?.*)?$/i.test(url);
}

const GO_MEDIA_BASE = process.env.NEXT_PUBLIC_GO_API_URL || '';

/**
 * Media uploaded via the Go API is served from the API host under /uploads/...;
 * external URLs and local /images pass through untouched.
 */
export function mediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return `${GO_MEDIA_BASE}${url}`;
  return url;
}

export async function fetchPublicProducts(): Promise<Product[]> {
  try {
    const res = await fetch('/api/marketing/products');
    if (!res.ok) return [];
    return (await res.json()) as Product[];
  } catch {
    return [];
  }
}

export async function fetchPublicBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch('/api/marketing/blog');
    if (!res.ok) return [];
    return (await res.json()) as BlogPost[];
  } catch {
    return [];
  }
}

export async function fetchPublicBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`/api/marketing/blog?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return (await res.json()) as BlogPost;
  } catch {
    return null;
  }
}

export async function fetchPublicPlans(): Promise<Plan[]> {
  try {
    const res = await fetch('/api/marketing/plans');
    if (!res.ok) return [];
    return (await res.json()) as Plan[];
  } catch {
    return [];
  }
}