import type {
  CoachLandingBlock,
  CoachLandingDocument,
  CanvasConfig,
  SocialLink,
} from '@/features/coach/landing-canvas/types';
import {
  htmlEscape,
  htmlAttrEscape,
  assertNever,
  sanitizeUrl,
  safeColor,
  safeFontFamily,
  defaultCanvasConfig,
  safeHeadingLevel,
  safeAlign,
  safeThickness,
  safeDividerStyle,
} from './block-utils';

/**
 * Escapes a CSS string value for use inside a <style> block.
 * Escapes \, ", <, > and & so coach-provided values can never break out of
 * the style block (F7).
 */
function cssString(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/**
 * Builds a style attribute string from optional BlockStyle fields.
 */
function blockStyleAttr(s: {
  backgroundColor?: string;
  textColor?: string;
  padding?: string;
  marginBottom?: string;
  width?: string;
  align?: string;
}): string {
  const parts: string[] = [];
  if (s.backgroundColor) parts.push(`background-color:${safeColor(s.backgroundColor, 'transparent')}`);
  if (s.textColor) parts.push(`color:${safeColor(s.textColor, '#fff')}`);
  if (s.padding) parts.push(`padding:${cssString(s.padding)}`);
  if (s.marginBottom) parts.push(`margin-bottom:${cssString(s.marginBottom)}`);
  if (s.width === 'full') parts.push('width:100%');
  if (s.width === 'boxed') parts.push('max-width:800px;margin-left:auto;margin-right:auto');
  if (s.align) parts.push(`text-align:${safeAlign(s.align, 'center')}`);
  return parts.length ? ` style="${htmlAttrEscape(parts.join('; '))}"` : '';
}

/**
 * Renders a single block to an HTML string for the standalone export.
 * All coach-provided text is escaped; no dangerouslySetInnerHTML equivalent.
 */
function renderBlockToHtml(block: CoachLandingBlock, config: CanvasConfig): string {
  const defaults = defaultCanvasConfig();
  switch (block.type) {
    case 'hero': {
      const p = block.props;
      const media = p.mediaUrl
        ? `<div class="export-hero-media"><img src="${htmlAttrEscape(p.mediaUrl)}" alt="${htmlAttrEscape(p.mediaAlt || '')}" style="max-width:100%;height:auto;border-radius:0.5rem;"></div>`
        : '';
      return `
        <section class="export-block export-hero${blockStyleAttr(p)}">
          ${media}
          <h1 style="font-size:2.5rem;font-weight:800;margin:0 0 1rem;line-height:1.1;color:${safeColor(config.primaryColor, defaults.primaryColor)}">${htmlEscape(p.headline)}</h1>
          ${p.subheadline ? `<p style="font-size:1.25rem;opacity:0.8;max-width:600px;margin:0 0 2rem;">${htmlEscape(p.subheadline)}</p>` : ''}
          ${p.ctaLabel ? `<a href="${htmlAttrEscape(sanitizeUrl(p.ctaUrl))}" class="export-btn">${htmlEscape(p.ctaLabel)}</a>` : ''}
        </section>
      `;
    }
    case 'heading': {
      const p = block.props;
      const tag = safeHeadingLevel(p.level, 'h2');
      return `<${tag} class="export-block export-heading${blockStyleAttr(p)}">${htmlEscape(p.text)}</${tag}>`;
    }
    case 'text': {
      const p = block.props;
      return `<div class="export-block export-text${blockStyleAttr(p)}">${htmlEscape(p.body)}</div>`;
    }
    case 'image': {
      const p = block.props;
      return `<div class="export-block export-image${blockStyleAttr(p)}"><img src="${htmlAttrEscape(p.src)}" alt="${htmlAttrEscape(p.alt)}" style="max-width:100%;height:auto;${p.rounded ? 'border-radius:0.5rem;' : ''}"></div>`;
    }
    case 'button': {
      const p = block.props;
      const primary = safeColor(config.primaryColor, defaults.primaryColor);
      const variantStyles: Record<string, string> = {
        primary: `background:${primary};color:#000;border-radius:0.5rem;padding:0.75rem 1.5rem;text-decoration:none;font-weight:600;display:inline-block;`,
        secondary: `border:1px solid ${primary};color:${primary};border-radius:0.5rem;padding:0.75rem 1.5rem;text-decoration:none;font-weight:600;display:inline-block;`,
        ghost: `color:${primary};text-decoration:none;padding:0.75rem 1.5rem;display:inline-block;`,
      };
      return `<a href="${htmlAttrEscape(sanitizeUrl(p.url))}" class="export-btn export-button" style="${variantStyles[p.variant]}">${htmlEscape(p.label)}</a>`;
    }
    case 'divider': {
      const p = block.props;
      const thickness = safeThickness(p.thickness, '1px');
      const dividerStyle = safeDividerStyle(p.style, 'solid');
      const dividerColor = safeColor(p.textColor || config.primaryColor, defaults.primaryColor);
      return `<hr class="export-block export-divider${blockStyleAttr(p)}" style="border:none;border-top:${thickness} ${dividerStyle} ${dividerColor};margin:0;">`;
    }
    case 'social-links': {
      const p = block.props;
      const dir = p.layout === 'column' ? 'flex-direction:column;align-items:flex-start;' : '';
      const linksHtml = p.links
        .map(
          (l: SocialLink) =>
            `<a href="${htmlAttrEscape(sanitizeUrl(l.url))}" style="margin:0 0.5rem;color:${safeColor(config.primaryColor, defaults.primaryColor)};text-decoration:none;">${htmlEscape(l.label)}</a>`,
        )
        .join('');
      return `<div class="export-block export-social-links${blockStyleAttr(p)}" style="${dir}">${linksHtml}</div>`;
    }
    case 'contact': {
      const p = block.props;
      const rows: string[] = [];
      if (p.email) rows.push(`<div><strong>Email:</strong> ${htmlEscape(p.email)}</div>`);
      if (p.phone) rows.push(`<div><strong>Tel:</strong> ${htmlEscape(p.phone)}</div>`);
      if (p.whatsapp) rows.push(`<div><strong>WhatsApp:</strong> ${htmlEscape(p.whatsapp)}</div>`);
      if (p.city) rows.push(`<div><strong>Ciudad:</strong> ${htmlEscape(p.city)}</div>`);
      const socialHtml = p.socialLinks.length
        ? `<div style="margin-top:0.5rem;">${p.socialLinks
            .map(
              (l: SocialLink) =>
                `<a href="${htmlAttrEscape(sanitizeUrl(l.url))}" style="margin:0 0.25rem;color:${safeColor(config.primaryColor, defaults.primaryColor)};text-decoration:none;">${htmlEscape(l.label)}</a>`,
            )
            .join('')}</div>`
        : '';
      return `<div class="export-block export-contact${blockStyleAttr(p)}">${rows.join('')}${socialHtml}</div>`;
    }
    default:
      return assertNever(block);
  }
}

/**
 * Generates a standalone HTML document from a CoachLandingDocument.
 * The output opens in any browser and renders the same content as the preview.
 */
export function exportDocumentToHtml(document: CoachLandingDocument): string {
  const { config, sections, title, subtitle } = document;

  const sectionsHtml = sections
    .map((block: CoachLandingBlock) => renderBlockToHtml(block, config))
    .join('');

  const primaryColor = config.primaryColor;
  const bgColor = config.backgroundColor;
  const fontFamily = config.fontFamily;
  const defaults = defaultCanvasConfig();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${safeFontFamily(fontFamily, defaults.fontFamily)};
      background: ${safeColor(bgColor, defaults.backgroundColor)};
      color: #fff;
      margin: 0;
      line-height: 1.6;
    }
    .export-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    .export-block {
      margin-bottom: 2rem;
    }
    .export-hero {
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 2rem;
      background: linear-gradient(135deg, ${safeColor(bgColor, defaults.backgroundColor)} 0%, #1a1a1a 100%);
    }
    .export-hero-media { margin-bottom: 1rem; }
    .export-hero h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.1; }
    .export-hero p { font-size: 1.25rem; opacity: 0.8; max-width: 600px; margin: 0 auto 2rem; }
    .export-btn {
      display: inline-block;
      background: ${safeColor(primaryColor, defaults.primaryColor)};
      color: #000;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      text-decoration: none;
    }
    .export-btn:hover { opacity: 0.9; }
    .export-heading { font-weight: 700; }
    .export-image img { border-radius: 0.5rem; }
    .export-divider { margin: 1.5rem 0; }
    .export-social-links a { margin: 0 0.5rem; }
    .export-contact strong { display: inline-block; min-width: 80px; }
  </style>
</head>
<body>
  <div class="export-page">
    <header class="export-block export-hero">
      <h1 style="font-size:2.5rem;font-weight:800;margin:0 0 1rem;line-height:1.1;color:${safeColor(primaryColor, defaults.primaryColor)}">${htmlEscape(title)}</h1>
      ${subtitle ? `<p style="font-size:1.25rem;opacity:0.8;max-width:600px;margin:0 0 2rem;">${htmlEscape(subtitle)}</p>` : ''}
    </header>
    <main class="export-sections">${sectionsHtml}</main>
  </div>
</body>
</html>`;
}
