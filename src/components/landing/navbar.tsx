'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/shared';

const NAV_LINKS = [
  { href: '#method', label: 'The Method' },
  { href: '#community', label: 'Results' },
  { href: '#ecosystem', label: 'Ecosystem' },
  { href: '#pricing', label: 'Pricing' },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant/30">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter flex justify-between items-center h-20">
        <Link
          href="/"
          className="font-display-xl text-2xl font-black italic text-electric-orange tracking-tighter"
        >
          MR TRAINING
        </Link>

        <div className="hidden md:flex space-x-8 items-center">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-label-bold text-label-bold uppercase tracking-wider text-on-surface hover:text-electric-orange transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
          <Button size="md">JOIN ELITE</Button>
        </div>

        <button
          className="md:hidden text-electric-orange"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-outline-variant/30">
          <div className="px-margin-mobile py-4 space-y-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block font-label-bold uppercase tracking-wider text-on-surface hover:text-electric-orange py-2"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Button size="md" className="w-full">JOIN ELITE</Button>
          </div>
        </div>
      )}
    </nav>
  );
}
