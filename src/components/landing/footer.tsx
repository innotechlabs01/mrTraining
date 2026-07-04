import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '#', label: 'Privacy Policy' },
  { href: '#', label: 'Terms of Service' },
  { href: '#', label: 'Athlete Support' },
  { href: '#', label: 'Affiliate Program' },
];

export function Footer() {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant/20 py-section-gap-sm">
      <div className="max-w-container-max mx-auto px-margin-mobile grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="font-display-xl text-2xl md:text-3xl font-black italic text-electric-orange mb-4">
            MR TRAINING
          </h2>
          <p className="font-body-md text-muted-gray mb-6">
            Optimizing human performance through data-driven methodology.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-muted-gray hover:text-velocity-blue transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:items-end gap-6">
          <div className="flex flex-wrap gap-x-8 gap-y-4 md:justify-end">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-muted-gray hover:text-velocity-blue transition-colors font-body-md text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="font-body-md text-muted-gray text-sm">
            &copy; 2024 MR TRAINING. OPTIMIZED PERFORMANCE.
          </p>
        </div>
      </div>
    </footer>
  );
}
