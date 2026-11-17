/**
 * ContactBlock — Datos de contacto y enlaces sociales del coach.
 * Server Component puro.
 */
import type {
  ContactBlockProps,
  CanvasConfig,
  SocialLink,
} from '@/features/coach/landing-canvas/types';
import { cn } from '@/lib/utils';
import { sanitizeUrl } from '@/features/coach/landing-canvas/utils/block-utils';

interface ContactBlockPropsInjected {
  block: { props: ContactBlockProps };
  config: CanvasConfig;
}

export function ContactBlock({
  block,
  config: _config,
}: ContactBlockPropsInjected): JSX.Element {
  const p = block.props;
  const blockStyle: React.CSSProperties = {};
  if (p.backgroundColor) blockStyle.backgroundColor = p.backgroundColor;
  if (p.textColor) blockStyle.color = p.textColor;
  if (p.padding) blockStyle.padding = p.padding;
  if (p.marginBottom) blockStyle.marginBottom = p.marginBottom;
  if (p.align) blockStyle.textAlign = p.align;

  return (
    <div
      className={cn('coach-landing-contact', p.width === 'full' ? 'w-full' : '')}
      style={blockStyle}
    >
      {p.email && (
        <div className="coach-landing-contact-row">
          <span className="coach-landing-contact-label">Email:</span>
          <a
            href={sanitizeUrl(`mailto:${encodeURIComponent(p.email)}`)}
            className="coach-landing-contact-value"
          >
            {p.email}
          </a>
        </div>
      )}
      {p.phone && (
        <div className="coach-landing-contact-row">
          <span className="coach-landing-contact-label">Tel:</span>
          <a href={sanitizeUrl(`tel:${p.phone}`)} className="coach-landing-contact-value">
            {p.phone}
          </a>
        </div>
      )}
      {p.whatsapp && (
        <div className="coach-landing-contact-row">
          <span className="coach-landing-contact-label">WhatsApp:</span>
          <a
            href={sanitizeUrl(`https://wa.me/${encodeURIComponent(p.whatsapp)}`)}
            className="coach-landing-contact-value"
          >
            {p.whatsapp}
          </a>
        </div>
      )}
      {p.city && (
        <div className="coach-landing-contact-row">
          <span className="coach-landing-contact-label">Ciudad:</span>
          <span className="coach-landing-contact-value">{p.city}</span>
        </div>
      )}
      {p.socialLinks.length > 0 && (
        <div className="coach-landing-contact-social mt-3">
          <div className="flex gap-3">
            {p.socialLinks.map((link: SocialLink) => (
              <a
                key={link.url}
                href={sanitizeUrl(link.url)}
                className="coach-landing-social-link text-current hover:opacity-75 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
