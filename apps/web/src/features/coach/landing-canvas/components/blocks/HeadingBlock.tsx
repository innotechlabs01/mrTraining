/**
 * HeadingBlock — Encabezado (h1-h4). Server Component puro.
 */
import type {
  HeadingBlockProps,
  CanvasConfig,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';

interface HeadingBlockPropsInjected {
  block: { props: HeadingBlockProps };
  config: CanvasConfig;
}

export function HeadingBlock({
  block,
  config: _config,
}: HeadingBlockPropsInjected): JSX.Element {
  const p = block.props;
  const Tag: 'h1' | 'h2' | 'h3' | 'h4' = p.level;
  const blockStyle: React.CSSProperties = {};
  if (p.backgroundColor) blockStyle.backgroundColor = p.backgroundColor;
  if (p.textColor) blockStyle.color = p.textColor;
  if (p.padding) blockStyle.padding = p.padding;
  if (p.marginBottom) blockStyle.marginBottom = p.marginBottom;
  if (p.align) blockStyle.textAlign = p.align;

  return (
    <Tag
      className={cn('coach-landing-heading', p.width === 'full' ? 'w-full' : '')}
      style={blockStyle}
    >
      {p.text}
    </Tag>
  );
}
