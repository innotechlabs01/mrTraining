import type { CSSProperties } from 'react';
import type {
  CoachLandingBlock,
  BlockType,
  CanvasConfig,
  HeroBlockProps,
  HeadingBlockProps,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  DividerBlockProps,
  SocialLinksBlockProps,
  ContactBlockProps,
} from '@/features/coach/landing-canvas/types';

/**
 * Exhaustive switch guard for discriminated unions over `BlockType`.
 * Throws at runtime if a new block type is added without a renderer case.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled block type: ${(value as { type: string }).type}`);
}

/**
 * Returns the discriminator string for a block type, used for palette labels.
 */
export function blockTypeLabel(type: BlockType): string {
  const labels: Record<BlockType, string> = {
    hero: 'Hero',
    heading: 'Título',
    text: 'Texto',
    image: 'Imagen',
    button: 'Botón',
    divider: 'Separador',
    'social-links': 'Redes sociales',
    contact: 'Contacto',
  };
  return labels[type];
}

/**
 * Generates a unique block id.
 */
export function newBlockId(): string {
  return `block-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

/**
 * Factory unica: crea el bloque por defecto para cada `BlockType`.
 * Usado por el canvas (F4) para que la paleta agregue el bloque correcto.
 */
export function createBlockForType(type: BlockType): CoachLandingBlock {
  switch (type) {
    case 'hero':
      return createHeroBlock();
    case 'heading':
      return createHeadingBlock();
    case 'text':
      return createTextBlock();
    case 'image':
      return createImageBlock();
    case 'button':
      return createButtonBlock();
    case 'divider':
      return createDividerBlock();
    case 'social-links':
      return createSocialLinksBlock();
    case 'contact':
      return createContactBlock();
    default:
      return assertNever(type);
  }
}

/**
 * Creates a default hero block.
 */
export function createHeroBlock(overrides: Partial<HeroBlockProps> = {}): CoachLandingBlock {
  return {
    id: newBlockId(),
    type: 'hero',
    order: 0,
    props: {
      headline: 'Tu entrenamiento, tu meta',
      subheadline: 'Entrenamiento personalizado para llevar tu rendimiento al siguiente nivel.',
      ctaLabel: 'Comenzar ahora',
      ctaUrl: '/',
      backgroundColor: undefined,
      textColor: undefined,
      padding: undefined,
      marginBottom: undefined,
      width: undefined,
      align: undefined,
      mediaUrl: undefined,
      mediaAlt: undefined,
      ...overrides,
    },
  };
}

/**
 * Creates a default heading block.
 */
export function createHeadingBlock(
  overrides: Partial<HeadingBlockProps> = {},
): CoachLandingBlock {
  return {
    id: newBlockId(),
    type: 'heading',
    order: 0,
    props: {
      level: 'h2',
      text: 'Nuevo título',
      backgroundColor: undefined,
      textColor: undefined,
      padding: undefined,
      marginBottom: undefined,
      width: undefined,
      align: undefined,
      ...overrides,
    },
  };
}

/**
 * Creates a default text block.
 */
export function createTextBlock(overrides: Partial<TextBlockProps> = {}): CoachLandingBlock {
  return {
    id: newBlockId(),
    type: 'text',
    order: 0,
    props: {
      body: 'Escribe tu contenido aquí.',
      backgroundColor: undefined,
      textColor: undefined,
      padding: undefined,
      marginBottom: undefined,
      width: undefined,
      align: undefined,
      ...overrides,
    },
  };
}

/**
 * Creates a default image block.
 */
export function createImageBlock(overrides: Partial<ImageBlockProps> = {}): CoachLandingBlock {
  return {
    id: newBlockId(),
    type: 'image',
    order: 0,
    props: {
      src: '',
      alt: 'Imagen',
      width: 'auto',
      rounded: false,
      backgroundColor: undefined,
      textColor: undefined,
      padding: undefined,
      marginBottom: undefined,
      align: undefined,
      ...overrides,
    },
  };
}

/**
 * Creates a default button block.
 */
export function createButtonBlock(
  overrides: Partial<ButtonBlockProps> = {},
): CoachLandingBlock {
  return {
    id: newBlockId(),
    type: 'button',
    order: 0,
    props: {
      label: 'Llamada a la acción',
      url: '/',
      variant: 'primary',
      size: 'md',
      backgroundColor: undefined,
      textColor: undefined,
      padding: undefined,
      marginBottom: undefined,
      width: undefined,
      align: undefined,
      ...overrides,
    },
  };
}

/**
 * Creates a default divider block.
 */
export function createDividerBlock(
  overrides: Partial<DividerBlockProps> = {},
): CoachLandingBlock {
  return {
    id: newBlockId(),
    type: 'divider',
    order: 0,
    props: {
      style: 'solid',
      thickness: '1px',
      backgroundColor: undefined,
      textColor: undefined,
      padding: undefined,
      marginBottom: undefined,
      width: undefined,
      align: undefined,
      ...overrides,
    },
  };
}

/**
 * Creates a default social-links block.
 */
export function createSocialLinksBlock(
  overrides: Partial<SocialLinksBlockProps> = {},
): CoachLandingBlock {
  return {
    id: newBlockId(),
    type: 'social-links',
    order: 0,
    props: {
      links: [],
      layout: 'row',
      backgroundColor: undefined,
      textColor: undefined,
      padding: undefined,
      marginBottom: undefined,
      width: undefined,
      align: undefined,
      ...overrides,
    },
  };
}

/**
 * Creates a default contact block.
 */
export function createContactBlock(
  overrides: Partial<ContactBlockProps> = {},
): CoachLandingBlock {
  return {
    id: newBlockId(),
    type: 'contact',
    order: 0,
    props: {
      email: undefined,
      phone: undefined,
      whatsapp: undefined,
      city: undefined,
      socialLinks: [],
      backgroundColor: undefined,
      textColor: undefined,
      padding: undefined,
      marginBottom: undefined,
      width: undefined,
      align: undefined,
      ...overrides,
    },
  };
}

/**
 * Default canvas config.
 */
export function defaultCanvasConfig(): CanvasConfig {
  return {
    primaryColor: '#15AAF2',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#0a0a0a',
  };
}

/**
 * HTML-escape helper for the standalone export. Escapes & < > " ' in text and
 * attribute contexts so coach-provided input can never inject markup.
 */
export function htmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTML-escape an attribute value (quotes are already escaped by htmlEscape,
 * but this keeps intent explicit).
 */
export function htmlAttrEscape(text: string): string {
  return htmlEscape(text);
}

/**
 * Sanitiza una URL para usarla en un atributo `href`.
 *
 * Permite solo esquemas http:, https:, mailto:, tel: y URLs relativas
 * (/..., #..., ./...). Cualquier otro esquema (javascript:, data:,
 * vbscript:, ...) devuelve '#' para evitar XSS almacenado en la pagina
 * publica y en el HTML exportado.
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string' || url === '') {
    return '#';
  }
  const trimmed = url.trim();
  if (trimmed === '') {
    return '#';
  }
  // URLs relativas y anclas: permiten sin esquema.
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  ) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (
      protocol === 'http:' ||
      protocol === 'https:' ||
      protocol === 'mailto:' ||
      protocol === 'tel:'
    ) {
      return trimmed;
    }
  } catch {
    // No es una URL absoluta valida -> rechazar.
  }
  return '#';
}

/**
 * Patron de colores CSS seguros: hex (3, 6 u 8 digitos), rgb/rgba, hsl/hsla
 * o nombre CSS simple (solo letras). Compartido por el renderer
 * (preview/pagina publica) y el HTML export (F12).
 */
export const SAFE_COLOR = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+)?\s*\)|hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)|hsla\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*[\d.]+)?\s*\)|[a-zA-Z]+)$/;

/**
 * Valida que un valor de color sea seguro. Devuelve el color si es valido, el
 * fallback si no lo es. Compartido por el renderer y el export (F12).
 */
export function safeColor(value: string | undefined, fallback: string): string {
  if (!value || !SAFE_COLOR.test(value.trim())) {
    return fallback;
  }
  return value.trim();
}

/**
 * Valida una familia tipografica (font-family). Solo permite letras, numeros,
 * espacios, comas, comillas simples/dobles, guion bajo y guion. Cualquier otro
 * caracter se descarta y, si queda vacio, se usa el default. Evita inyeccion
 * de CSS via el atributo style (F12).
 */
export const SAFE_FONT_FAMILY = /^[A-Za-z0-9 ,'"_-]*$/;

export function safeFontFamily(value: string | undefined, fallback: string): string {
  if (!value || !SAFE_FONT_FAMILY.test(value.trim())) {
    return fallback;
  }
  return value.trim();
}

/**
 * Allowlist para el nivel de encabezado (h1..h4). Los datos que vienen de la
 * DB nunca se confian aunque TypeScript los tipese como un nivel valido (R3).
 * Default 'h2', igual que createHeadingBlock.
 */
export const SAFE_HEADING_LEVELS: ReadonlyArray<'h1' | 'h2' | 'h3' | 'h4'> = [
  'h1',
  'h2',
  'h3',
  'h4',
];

export function safeHeadingLevel(
  value: string | undefined,
  fallback: string = 'h2',
): 'h1' | 'h2' | 'h3' | 'h4' {
  if (
    typeof value === 'string' &&
    SAFE_HEADING_LEVELS.includes(value as 'h1' | 'h2' | 'h3' | 'h4')
  ) {
    return value as 'h1' | 'h2' | 'h3' | 'h4';
  }
  return fallback as 'h1' | 'h2' | 'h3' | 'h4';
}

/**
 * Allowlist para la alineacion de texto (R3). Default 'center'.
 */
export const SAFE_ALIGNS: ReadonlyArray<'left' | 'center' | 'right' | 'justify'> = [
  'left',
  'center',
  'right',
  'justify',
];

export function safeAlign(
  value: string | undefined,
  fallback: string = 'center',
): 'left' | 'center' | 'right' | 'justify' {
  if (
    typeof value === 'string' &&
    SAFE_ALIGNS.includes(value as 'left' | 'center' | 'right' | 'justify')
  ) {
    return value as 'left' | 'center' | 'right' | 'justify';
  }
  return fallback as 'left' | 'center' | 'right' | 'justify';
}

/**
 * Valida el grosor del separador: solo enteros 1..20 seguidos de 'px'.
 * Default '1px' (igual que createDividerBlock). (R3)
 */
export function safeThickness(
  value: string | undefined,
  fallback: string = '1px',
): string {
  if (typeof value !== 'string') return fallback;
  const m = value.match(/^(\d{1,2})px$/);
  if (!m) return fallback;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > 20) return fallback;
  return `${n}px`;
}

/**
 * Allowlist para el estilo del separador (R3). Default 'solid'.
 */
export const SAFE_DIVIDER_STYLES: ReadonlyArray<'solid' | 'dashed' | 'dotted'> = [
  'solid',
  'dashed',
  'dotted',
];

export function safeDividerStyle(
  value: string | undefined,
  fallback: string = 'solid',
): 'solid' | 'dashed' | 'dotted' {
  if (
    typeof value === 'string' &&
    SAFE_DIVIDER_STYLES.includes(value as 'solid' | 'dashed' | 'dotted')
  ) {
    return value as 'solid' | 'dashed' | 'dotted';
  }
  return fallback as 'solid' | 'dashed' | 'dotted';
}

/**
 * Construye las variables CSS del tema del coach a partir del config global:
 * --coach-primary, --coach-bg y --coach-font, con valores sanitizados.
 * Inyectado por CoachLandingDocumentView en el contenedor de pagina para que
 * el config del inspector se aplique tanto en preview como en pagina publica
 * (F12).
 */
export function buildCoachLandingCssVars(config: CanvasConfig): CSSProperties {
  const defaults = defaultCanvasConfig();
  return {
    '--coach-primary': safeColor(config.primaryColor, defaults.primaryColor),
    '--coach-bg': safeColor(config.backgroundColor, defaults.backgroundColor),
    '--coach-font': safeFontFamily(config.fontFamily, defaults.fontFamily),
  } as unknown as CSSProperties;
}

