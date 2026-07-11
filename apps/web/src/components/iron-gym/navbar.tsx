'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';

const mainLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
];

const dropdownItems = [
  { label: 'Strength', href: '/programs/strength' },
  { label: 'Cardio', href: '/programs/cardio' },
  { label: 'Yoga & Mobility', href: '/programs/yoga' },
  { label: 'Boxing & Combat', href: '/programs/boxing' },
];

const supportItems = [
  { label: 'FAQ', href: '/faq' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Help Center', href: '/help' },
];

const moreItems = [
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Events', href: '/events' },
];

export function IronGymNavbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAnchorClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      router.push(href);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto h-[88px] px-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-white">
          <Dumbbell className="w-8 h-8 text-brand-primary" />
          <span className="text-xl font-bold tracking-tight">
            MR<span className="text-brand-primary">Training</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {mainLinks.map((l) => (
            <a
              key={l.label}
              onClick={(e) => {
                e.preventDefault();
                handleAnchorClick(l.href);
              }}
              className="text-sm font-medium transition-colors text-[#9e9e9e] hover:text-white cursor-pointer"
            >
              {l.label}
            </a>
          ))}

          {/* Programs Dropdown */}
          <div className="relative" onMouseEnter={() => setOpenDropdown('programs')} onMouseLeave={() => setOpenDropdown(null)}>
            <button
              className="flex items-center gap-1 text-sm font-medium transition-colors text-[#9e9e9e] hover:text-white cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                setOpenDropdown(openDropdown === 'programs' ? null : 'programs');
              }}
            >
              Programs
              <ChevronDown className="w-4 h-4" />
            </button>
            {openDropdown === 'programs' && (
              <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#111111] py-2 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                {dropdownItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="block px-4 py-2 text-sm text-[#9e9e9e] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Support Dropdown */}
          <div className="relative" onMouseEnter={() => setOpenDropdown('support')} onMouseLeave={() => setOpenDropdown(null)}>
            <button
              className="flex items-center gap-1 text-sm font-medium transition-colors text-[#9e9e9e] hover:text-white cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                setOpenDropdown(openDropdown === 'support' ? null : 'support');
              }}
            >
              Support
              <ChevronDown className="w-4 h-4" />
            </button>
            {openDropdown === 'support' && (
              <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#111111] py-2 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                {supportItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="block px-4 py-2 text-sm text-[#9e9e9e] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* More Dropdown */}
          <div className="relative" onMouseEnter={() => setOpenDropdown('more')} onMouseLeave={() => setOpenDropdown(null)}>
            <button
              className="flex items-center gap-1 text-sm font-medium transition-colors text-[#9e9e9e] hover:text-white cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                setOpenDropdown(openDropdown === 'more' ? null : 'more');
              }}
            >
              More
              <ChevronDown className="w-4 h-4" />
            </button>
            {openDropdown === 'more' && (
              <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#111111] py-2 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                {moreItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="block px-4 py-2 text-sm text-[#9e9e9e] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <a
            href="#planes"
            onClick={(e) => {
              e.preventDefault();
              handleAnchorClick('#planes');
            }}
            className="text-sm font-medium transition-colors text-[#9e9e9e] hover:text-white cursor-pointer"
          >
            Plans
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/coach/login')}
            className="px-5 py-3 rounded-md border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            Coaching
          </button>
          <a
            href="#planes"
            onClick={(e) => {
              e.preventDefault();
              handleAnchorClick('#planes');
            }}
            className="px-6 py-3 rounded-md bg-white text-[#212121] text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started
          </a>
        </div>
      </nav>
    </header>
  );
}