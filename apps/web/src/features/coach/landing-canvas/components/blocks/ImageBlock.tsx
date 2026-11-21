/**
 * ImageBlock — Imagen con alt opcional y borde redondeado. Server Component puro.
 */
import type {
  ImageBlockProps,
  CanvasConfig,
  CoachLandingBlockInteractionProps,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';
import { getBlockInteractionState } from './block-interaction';

interface ImageBlockPropsInjected extends CoachLandingBlockInteractionProps {
  block: { id: string; props: ImageBlockProps };
  config: CanvasConfig;
}

export function ImageBlock({
  block,
  config: _config,
  onSelectBlock,
  selectedBlockId,
}: ImageBlockPropsInjected): JSX.Element {
  const p = block.props;
  const interaction = getBlockInteractionState(block.id, {
    onSelectBlock,
    selectedBlockId,
  });
  const blockStyle: React.CSSProperties = {};
  if (p.backgroundColor) blockStyle.backgroundColor = p.backgroundColor;
  if (p.textColor) blockStyle.color = p.textColor;
  if (p.padding) blockStyle.padding = p.padding;
  if (p.marginBottom) blockStyle.marginBottom = p.marginBottom;
  if (p.align) blockStyle.textAlign = p.align;

  return (
    <div
      className={cn(
        'coach-landing-image',
        p.width === 'full' ? 'w-full' : '',
        interaction.isSelectable && 'coach-landing-block-selectable',
        interaction.isSelected && 'coach-landing-block-selected',
      )}
      style={blockStyle}
      role={interaction.isSelectable ? 'button' : undefined}
      tabIndex={interaction.isSelectable ? 0 : undefined}
      aria-pressed={
        interaction.isSelectable ? interaction.isSelected : undefined
      }
      onClick={interaction.handleClick}
      onKeyDown={interaction.handleKeyDown}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.src}
        alt={p.alt}
        className={cn(
          'coach-landing-image-img w-full h-auto',
          p.rounded ? 'rounded-lg' : '',
          p.width === 'full' ? 'max-w-none' : 'max-w-full',
        )}
      />
    </div>
  );
}
