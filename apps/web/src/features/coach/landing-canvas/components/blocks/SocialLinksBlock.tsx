/**
 * SocialLinksBlock — Enlaces de redes sociales en fila o columna.
 * Server Component puro.
 */
import type {
  SocialLinksBlockProps,
  CanvasConfig,
  SocialLink,
  CoachLandingBlockInteractionProps,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';
import { sanitizeUrl } from '@/features/coach/landing-canvas/utils/block-utils';
import { getBlockInteractionState } from './block-interaction';

interface SocialLinksBlockPropsInjected extends CoachLandingBlockInteractionProps {
  block: { id: string; props: SocialLinksBlockProps };
  config: CanvasConfig;
}

export function SocialLinksBlock({
  block,
  config: _config,
  onSelectBlock,
  selectedBlockId,
}: SocialLinksBlockPropsInjected): JSX.Element {
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

  const isRow = p.layout !== 'column';

  return (
    <div
      className={cn(
        'coach-landing-social-links',
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
      <div
        className={cn(
          'coach-landing-social-links-list flex gap-3',
          isRow ? 'flex-row' : 'flex-col',
          p.align === 'center' ? 'justify-center' : '',
          p.align === 'right' ? 'justify-end' : '',
        )}
      >
        {p.links.map((link: SocialLink) => (
          <a
            key={link.url}
            href={sanitizeUrl(link.url)}
            className={cn(
              'coach-landing-social-link text-current hover:opacity-75 transition-colors',
              link.icon ? '' : 'underline-offset-2 hover:underline',
            )}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
