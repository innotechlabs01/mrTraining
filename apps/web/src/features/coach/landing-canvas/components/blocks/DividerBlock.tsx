/**
 * DividerBlock — Línea divisoria. Server Component puro.
 */
import type {
  DividerBlockProps,
  CanvasConfig,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';

interface DividerBlockPropsInjected {
  block: { props: DividerBlockProps };
  config: CanvasConfig;
}

export function DividerBlock({
  block,
  config,
}: DividerBlockPropsInjected): JSX.Element {
  const p = block.props;
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
      className={cn('coach-landing-divider-wrapper', p.align === 'center' ? 'flex justify-center' : '')}
      style={blockStyle}
    >
      <hr className="coach-landing-divider" style={dividerStyle} />
    </div>
  );
}
