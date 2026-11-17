/**
 * ButtonBlock — Botón de llamada a la acción. Server Component puro.
 */
import type {
  ButtonBlockProps,
  CanvasConfig,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';
import { sanitizeUrl } from '@/features/coach/landing-canvas/utils/block-utils';

interface ButtonBlockPropsInjected {
  block: { props: ButtonBlockProps };
  config: CanvasConfig;
}

export function ButtonBlock({
  block,
  config,
}: ButtonBlockPropsInjected): JSX.Element {
  const p = block.props;
  const blockStyle: React.CSSProperties = {};
  if (p.backgroundColor) blockStyle.backgroundColor = p.backgroundColor;
  if (p.textColor) blockStyle.color = p.textColor;
  if (p.padding) blockStyle.padding = p.padding;
  if (p.marginBottom) blockStyle.marginBottom = p.marginBottom;
  if (p.align) blockStyle.textAlign = p.align;

  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses: Record<string, string> = {
    primary: 'coach-landing-btn-primary',
    secondary: 'coach-landing-btn-secondary border border-current',
    ghost: 'coach-landing-btn-ghost text-current underline-offset-4 hover:underline',
  };

  const buttonStyle: React.CSSProperties = {};
  if (p.variant === 'primary') {
    buttonStyle.backgroundColor = config.primaryColor;
    buttonStyle.color = '#000';
  }

  return (
    <div
      className={cn('coach-landing-button-wrapper', p.width === 'full' ? 'w-full' : '')}
      style={blockStyle}
    >
      <a
        href={sanitizeUrl(p.url)}
        className={cn(
          'coach-landing-button inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          sizeClasses[p.size ?? 'md'],
          variantClasses[p.variant],
          p.align === 'center' ? 'mx-auto' : '',
          p.align === 'right' ? 'ml-auto' : '',
        )}
        style={buttonStyle}
      >
        {p.label}
      </a>
    </div>
  );
}
