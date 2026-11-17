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
