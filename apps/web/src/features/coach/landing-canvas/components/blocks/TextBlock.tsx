/**
 * TextBlock — Párrafo de texto rico. Server Component puro.
 */
import type {
  TextBlockProps,
  CanvasConfig,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';

interface TextBlockPropsInjected {
  block: { props: TextBlockProps };
  config: CanvasConfig;
}

export function TextBlock({
  block,
  config: _config,
}: TextBlockPropsInjected): JSX.Element {
  const p = block.props;
  const blockStyle: React.CSSProperties = {};
  if (p.backgroundColor) blockStyle.backgroundColor = p.backgroundColor;
  if (p.textColor) blockStyle.color = p.textColor;
  if (p.padding) blockStyle.padding = p.padding;
  if (p.marginBottom) blockStyle.marginBottom = p.marginBottom;
  if (p.align) blockStyle.textAlign = p.align;

  return (
    <div
      className={cn('coach-landing-text', p.width === 'full' ? 'w-full' : '')}
      style={blockStyle}
    >
      {p.body}
    </div>
  );
}
