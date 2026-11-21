/**
 * DividerBlock — Línea divisoria. Server Component puro.
 */
import type {
  DividerBlockProps,
  CanvasConfig,
  CoachLandingBlockInteractionProps,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';
import { getBlockInteractionState } from './block-interaction';

interface DividerBlockPropsInjected extends CoachLandingBlockInteractionProps {
  block: { id: string; props: DividerBlockProps };
  config: CanvasConfig;
}

export function DividerBlock({
  block,
  config,
  onSelectBlock,
  selectedBlockId,
}: DividerBlockPropsInjected): JSX.Element {
  const p = block.props;
  const interaction = getBlockInteractionState(block.id, {
    onSelectBlock,
    selectedBlockId,
  });
  const blockStyle: React.CSSProperties = {};
  if (p.backgroundColor) blockStyle.backgroundColor = p.backgroundColor;
  if (p.marginBottom) blockStyle.marginBottom = p.marginBottom;
  if (p.width === 'full') blockStyle.width = '100%';

  const dividerStyle: React.CSSProperties = {
    border: 'none',
    borderTop: `${p.thickness} ${p.style} ${p.textColor ?? config.primaryColor}`,
    margin: 0,
  };

  return (
    <div
      className={cn(
        'coach-landing-divider-wrapper',
        p.align === 'center' ? 'flex justify-center' : '',
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
      <hr className="coach-landing-divider" style={dividerStyle} />
    </div>
  );
}
