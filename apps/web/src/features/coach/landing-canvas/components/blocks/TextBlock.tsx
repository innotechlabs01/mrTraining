/**
 * TextBlock — Párrafo de texto rico. Server Component puro.
 */
import type {
  TextBlockProps,
  CanvasConfig,
  CoachLandingBlockInteractionProps,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';
import { getBlockInteractionState } from './block-interaction';

interface TextBlockPropsInjected extends CoachLandingBlockInteractionProps {
  block: { id: string; props: TextBlockProps };
  config: CanvasConfig;
}

export function TextBlock({
  block,
  config: _config,
  onSelectBlock,
  selectedBlockId,
}: TextBlockPropsInjected): JSX.Element {
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
        'coach-landing-text',
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
      {p.body}
    </div>
  );
}
