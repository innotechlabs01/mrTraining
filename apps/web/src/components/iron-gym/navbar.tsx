'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell } from 'lucide-react';

const links = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Plans', href: '/coach/planes' },
];

export function IronGymNavbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium transition-colors text-[#9e9e9e] hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/coach/login')}
            className="px-5 py-3 rounded-md border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            Coaching
          </button>
          <a
            href="/coach/planes"
            className="px-6 py-3 rounded-md bg-white text-[#212121] text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started
          </a>
        </div>
      </nav>
    </header>
  );
}