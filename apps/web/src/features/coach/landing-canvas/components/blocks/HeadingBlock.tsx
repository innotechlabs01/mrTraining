/**
 * HeadingBlock — Encabezado (h1-h4). Server Component puro.
 */
import type {
  HeadingBlockProps,
  CanvasConfig,
  CoachLandingBlockInteractionProps,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';
import { getBlockInteractionState } from './block-interaction';

interface HeadingBlockPropsInjected extends CoachLandingBlockInteractionProps {
  block: { id: string; props: HeadingBlockProps };
  config: CanvasConfig;
}

export function HeadingBlock({
  block,
  config: _config,
  onSelectBlock,
  selectedBlockId,
}: HeadingBlockPropsInjected): JSX.Element {
  const p = block.props;
  const interaction = getBlockInteractionState(block.id, {
    onSelectBlock,
    selectedBlockId,
  });
  const Tag: 'h1' | 'h2' | 'h3' | 'h4' = p.level;
  const blockStyle: React.CSSProperties = {};
  if (p.backgroundColor) blockStyle.backgroundColor = p.backgroundColor;
  if (p.textColor) blockStyle.color = p.textColor;
  if (p.padding) blockStyle.padding = p.padding;
  if (p.marginBottom) blockStyle.marginBottom = p.marginBottom;
  if (p.align) blockStyle.textAlign = p.align;

  return (
    <Tag
      className={cn(
        'coach-landing-heading',
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
      {p.text}
    </Tag>
  );
}
