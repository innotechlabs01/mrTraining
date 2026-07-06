import Link from 'next/link';

const RESOURCE_LINKS = [
  { href: '#', label: 'Training Philosophy' },
  { href: '#', label: 'Success Stories' },
  { href: '#', label: 'Affiliate Program' },
  { href: '#', label: 'Knowledge Base' },
];

const SUPPORT_LINKS = [
  { href: '#', label: 'Contact Support' },
  { href: '#', label: 'FAQ' },
  { href: '#', label: 'Terms of Service' },
  { href: '#', label: 'Privacy Policy' },
];

export function Footer() {
  return (
    <footer className="bg-[#0F0F0F] border-t border-[#2C2C2C]/20 py-16">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <h2 className="font-display-xl text-2xl font-black italic text-white mb-4">
              <span className="text-[#0066FF]">MR</span> TRAINING
            </h2>
            <p className="text-sm text-[#C4C7C7] leading-relaxed">
              The definitive standard in athletic excellence and lifestyle optimization.
            </p>
          </div>

          <div>
            <h4 className="font-label-bold text-xs uppercase tracking-[0.2em] text-[#C4C7C7] mb-6">
              Resources
            </h4>
            <div className="space-y-4">
              {RESOURCE_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-white/60 hover:text-[#0066FF] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-label-bold text-xs uppercase tracking-[0.2em] text-[#C4C7C7] mb-6">
              Support
            </h4>
            <div className="space-y-4">
              {SUPPORT_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-white/60 hover:text-[#0066FF] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-label-bold text-xs uppercase tracking-[0.2em] text-[#C4C7C7] mb-6">
              Newsletter
            </h4>
            <p className="text-sm text-[#C4C7C7] mb-4">
              Subscribe for performance insights and elite athlete updates.
            </p>
            <div className="flex border-b border-[#2C2C2C]/50 pb-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-transparent text-sm text-white flex-1 outline-none placeholder:text-[#C4C7C7]"
              />
              <button className="text-[#FF6B00] hover:text-[#FF6B00]/80 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[#2C2C2C]/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#C4C7C7]">
            &copy; 2024 MR TRAINING. ENGINEERED FOR ELITE RESULTS.
          </p>
          <Link href="#" className="text-[#C4C7C7] hover:text-[#0066FF] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  );
}
