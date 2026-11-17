/**
 * ImageBlock — Imagen con alt opcional y borde redondeado. Server Component puro.
 */
import type {
  ImageBlockProps,
  CanvasConfig,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';

interface ImageBlockPropsInjected {
  block: { props: ImageBlockProps };
  config: CanvasConfig;
}

export function ImageBlock({
  block,
  config: _config,
}: ImageBlockPropsInjected): JSX.Element {
  const p = block.props;
  const blockStyle: React.CSSProperties = {};
  if (p.backgroundColor) blockStyle.backgroundColor = p.backgroundColor;
  if (p.textColor) blockStyle.color = p.textColor;
  if (p.padding) blockStyle.padding = p.padding;
  if (p.marginBottom) blockStyle.marginBottom = p.marginBottom;
  if (p.align) blockStyle.textAlign = p.align;

  return (
    <div
      className={cn('coach-landing-image', p.width === 'full' ? 'w-full' : '')}
      style={blockStyle}
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
