/**
 * CoachLandingBlock — Renderizador unico de bloques de landing de coach.
 *
 * Es un Server Component puro: sin 'use client', sin hooks, sin APIs del
 * navegador. Se usa tanto en la vista previa del canvas (cliente) como en
 * la pagina publica /l/[slug] (servidor) mediante el mismo import path,
 * lo que garantiza WYSIWYG por construccion (D1).
 *
 * Nunca usa dangerouslySetInnerHTML con input del coach. Todo texto se
 * renderiza via JSX (React escapa).
 */
import type {
  CoachLandingBlock,
  CanvasConfig,
  HeroBlockProps,
  HeadingBlockProps,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  DividerBlockProps,
  SocialLinksBlockProps,
  ContactBlockProps,
  SocialLink,
  CoachLandingBlockInteractionProps,
} from '@/features/coach/landing-canvas/types';
import { assertNever } from '@/features/coach/landing-canvas/utils/block-utils';
import { HeroBlock } from './HeroBlock';
import { HeadingBlock } from './HeadingBlock';
import { TextBlock } from './TextBlock';
import { ImageBlock } from './ImageBlock';
import { ButtonBlock } from './ButtonBlock';
import { DividerBlock } from './DividerBlock';
import { SocialLinksBlock } from './SocialLinksBlock';
import { ContactBlock } from './ContactBlock';

interface CoachLandingBlockProps extends CoachLandingBlockInteractionProps {
  block: CoachLandingBlock;
  config: CanvasConfig;
}

export function CoachLandingBlock({
  block,
  config,
  onSelectBlock,
  selectedBlockId,
}: CoachLandingBlockProps): JSX.Element {
  switch (block.type) {
    case 'hero':
      return (
        <HeroBlock
          block={block}
          config={config}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
        />
      );
    case 'heading':
      return (
        <HeadingBlock
          block={block}
          config={config}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
        />
      );
    case 'text':
      return (
        <TextBlock
          block={block}
          config={config}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
        />
      );
    case 'image':
      return (
        <ImageBlock
          block={block}
          config={config}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
        />
      );
    case 'button':
      return (
        <ButtonBlock
          block={block}
          config={config}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
        />
      );
    case 'divider':
      return (
        <DividerBlock
          block={block}
          config={config}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
        />
      );
    case 'social-links':
      return (
        <SocialLinksBlock
          block={block}
          config={config}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
        />
      );
    case 'contact':
      return (
        <ContactBlock
          block={block}
          config={config}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
        />
      );
    default:
      return assertNever(block);
  }
}

export type {
  HeroBlockProps,
  HeadingBlockProps,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  DividerBlockProps,
  SocialLinksBlockProps,
  ContactBlockProps,
  SocialLink,
};
