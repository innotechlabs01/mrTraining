export type BlockType =
  | 'hero'
  | 'heading'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'social-links'
  | 'contact';

export interface BaseBlock {
  id: string;
  type: BlockType;
  order: number;
}

export interface BlockStyle {
  backgroundColor?: string;
  textColor?: string;
  padding?: string;
  marginBottom?: string;
  width?: 'full' | 'boxed' | 'auto';
  align?: 'left' | 'center' | 'right';
}

export interface HeroBlockProps extends BlockStyle {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaUrl: string;
  mediaUrl?: string;
  mediaAlt?: string;
}

export interface HeadingBlockProps extends BlockStyle {
  level: 'h1' | 'h2' | 'h3' | 'h4';
  text: string;
}

export interface TextBlockProps extends BlockStyle {
  body: string;
}

export interface ImageBlockProps extends BlockStyle {
  src: string;
  alt: string;
  width?: 'auto' | 'full';
  rounded?: boolean;
}

export interface ButtonBlockProps extends BlockStyle {
  label: string;
  url: string;
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export interface DividerBlockProps extends BlockStyle {
  style: 'solid' | 'dashed' | 'dotted';
  thickness: '1px' | '2px';
}

export interface SocialLink {
  label: string;
  url: string;
  icon?: string;
}

export interface SocialLinksBlockProps extends BlockStyle {
  links: SocialLink[];
  layout?: 'row' | 'column';
}

export interface ContactBlockProps extends BlockStyle {
  email?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  socialLinks: SocialLink[];
}

// Unión discriminada: cada bloque lleva id, type, order + props propios
export type CoachLandingBlock =
  | (BaseBlock & { type: 'hero'; props: HeroBlockProps })
  | (BaseBlock & { type: 'heading'; props: HeadingBlockProps })
  | (BaseBlock & { type: 'text'; props: TextBlockProps })
  | (BaseBlock & { type: 'image'; props: ImageBlockProps })
  | (BaseBlock & { type: 'button'; props: ButtonBlockProps })
  | (BaseBlock & { type: 'divider'; props: DividerBlockProps })
  | (BaseBlock & { type: 'social-links'; props: SocialLinksBlockProps })
  | (BaseBlock & { type: 'contact'; props: ContactBlockProps });

export interface CanvasConfig {
  primaryColor: string;
  fontFamily: string;
  backgroundColor: string;
}

/**
 * Interaccion opcional del renderer para el modo editor. Cuando
 * `onSelectBlock` no se pasa, el markup publico permanece sin cambios.
 */
export interface CoachLandingBlockInteractionProps {
  onSelectBlock?: ((id: string) => void) | undefined;
  selectedBlockId?: string | null | undefined;
}

export interface ImageAsset {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface CoachLandingDocument {
  id: string;
  coachId: string;
  slug: string;
  title: string;
  subtitle: string;
  config: CanvasConfig;
  sections: CoachLandingBlock[];
  images: ImageAsset[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoachLandingListItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  isPublished: boolean;
  updatedAt: string;
}
