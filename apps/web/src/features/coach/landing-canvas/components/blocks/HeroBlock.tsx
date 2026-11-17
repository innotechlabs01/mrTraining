/**
 * HeroBlock — Sección hero con titular, subtítulo, CTA y media opcional.
 * Server Component puro.
 */
import type {
  HeroBlockProps,
  CanvasConfig,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';

interface HeroBlockPropsInjected {
  block: { props: HeroBlockProps };
  config: CanvasConfig;
}

export function HeroBlock({
  block,
  config,
}: HeroBlockPropsInjected): JSX.Element {
  const p = block.props;
  const blockStyle: React.CSSProperties = {};
  if (p.backgroundColor) blockStyle.backgroundColor = p.backgroundColor;
  if (p.textColor) blockStyle.color = p.textColor;
  if (p.padding) blockStyle.padding = p.padding;
  if (p.marginBottom) blockStyle.marginBottom = p.marginBottom;
  if (p.align) blockStyle.textAlign = p.align;

  return (
    <section
      className={cn('coach-landing-hero', p.width === 'full' ? 'w-full' : 'max-w-boxed mx-auto')}
      style={blockStyle}
    >
      {p.mediaUrl && (
        <div className="coach-landing-hero-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.mediaUrl}
            alt={p.mediaAlt ?? 'Hero'}
            className="w-full h-auto object-cover max-h-96"
          />
        </div>
      )}
      <h1 className="coach-landing-hero-headline">{p.headline}</h1>
      {p.subheadline && (
        <p className="coach-landing-hero-subheadline">{p.subheadline}</p>
      )}
      {p.ctaLabel && (
        <a
          href={p.ctaUrl}
          className={cn(
            'coach-landing-hero-cta inline-block',
            config.primaryColor ? `bg-[${config.primaryColor}] text-black` : '',
          )}
        >
          {p.ctaLabel}
        </a>
      )}
    </section>
  );
}
