'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/shared';

const NAV_LINKS = [
  { href: '#programs', label: 'Programs' },
  { href: '#coaches', label: 'Coaches' },
  { href: '#ecosystem', label: 'Ecosystem' },
  { href: '#transformations', label: 'Transformations' },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#0F0F0F]/80 backdrop-blur-md border-b border-[#2C2C2C]/30">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6 flex justify-between items-center h-20">
        <Link href="/" className="flex items-baseline gap-0">
          <span className="font-display-xl text-2xl font-black italic text-[#0066FF] tracking-tighter">
            MR
          </span>
          <span className="font-display-xl text-2xl font-black italic text-white tracking-tighter">
            {' '}TRAINING
          </span>
        </Link>

        <div className="hidden md:flex space-x-10 items-center">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-label-bold text-xs uppercase tracking-[0.15em] text-[#E2E2E2] hover:text-[#FF6B00] transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
          <Button size="md">START TRAINING</Button>
        </div>

        <button
          className="md:hidden text-[#FF6B00]"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden bg-[#0F0F0F]/95 backdrop-blur-md border-b border-[#2C2C2C]/30">
          <div className="px-5 py-4 space-y-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block font-label-bold text-xs uppercase tracking-[0.15em] text-[#E2E2E2] hover:text-[#FF6B00] py-2"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Button size="md" className="w-full">
              START TRAINING
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
