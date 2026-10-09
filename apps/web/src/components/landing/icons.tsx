import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function StarIcon(props: IconProps) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <polygon points="12,2 15,9 22,9.5 16.8,14.2 18.5,21 12,17.2 5.5,21 7.2,14.2 2,9.5 9,9" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="10,7 5,12 10,17" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="14,7 19,12 14,17" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" {...props}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" {...props}>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M12.04 2.01C6.5 2.01 2 6.19 2 11.36c0 1.93.49 3.79 1.41 5.37l-1.33 4.54 4.67-2.7c1.45.38 2.96.59 4.49.59 5.54 0 9.75-4.56 9.75-9.95S17.58 2.01 12.04 2.01Zm5.34 13.66c-.28.18-2.57 1.46-4.85 2.72-.18.1-.31.07-.41-.03C9.85 17.52 7.3 16.87 6.3 16.27c-.28-.18-.5-.18-.7-.19-.18-.02-1.29-.44-2.19-1.55-.24-.33-.43-.7-.43-1.14 0-.44.22-.7.59-1 .42.22 1.53.95 2.49 2.06.2.22.39.26.53.06.13-.17 1.77-2.55 2.12-2.88a.49.49 0 0 0-.06-.83c-.32.1-1.78.64-3.07 1.56a17.97 17.97 0 0 1-2.36-3c-.23-.4-.46-.41-.59-.42-.13 0-.39-.03-.59-.03a1.3 1.3 0 0 0-.95.42 1.33 1.33 0 0 0-.32.9C5.28 10.72 8.35 13.67 10.8 15c.35 0 .84.07 1.3-.18.39-.19 1.05-.58 1.49-.99s.72-.89.8-.96c.08-.07.09.17 1.35-.05 1.49Z" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}