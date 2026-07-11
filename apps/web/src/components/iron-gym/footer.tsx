'use client';

import { Dumbbell, Phone, Mail, Facebook, Twitter, Instagram } from 'lucide-react';

const linkColumns = [
  {
    title: 'Quick Links',
    links: [
      { label: 'Home', href: '/' },
      { label: 'About Us', href: '/about' },
      { label: 'Services', href: '/services' },
      { label: 'Plans', href: '/coach/planes' },
    ],
  },
  {
    title: 'Programs',
    links: [
      { label: 'Strength', href: '/programs/strength' },
      { label: 'Cardio', href: '/programs/cardio' },
      { label: 'Yoga', href: '/programs/yoga' },
      { label: 'Boxing', href: '/programs/boxing' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Help', href: '/help' },
    ],
  },
  {
    title: 'More',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'Events', href: '/events' },
    ],
  },
];

export function IronGymFooter() {
  return (
    <footer>
      <div className="relative bg-[#111111] overflow-hidden">
        <img
          src="/iron-gym/footer-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 text-center">
          <p className="text-white font-medium text-lg">Call Us Now</p>
          <p className="mt-2 text-3xl lg:text-4xl font-bold text-white">+91 82000-60000</p>
        </div>
      </div>

      <div className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-10">
            <div className="lg:col-span-2">
              <a href="/" className="flex items-center gap-2 text-[#212121]">
                <Dumbbell className="w-7 h-7 text-brand-primary" />
                <span className="text-lg font-bold">
                  MR<span className="text-brand-primary">Training</span>
                </span>
              </a>
              <p className="mt-4 text-sm text-[#212121] leading-relaxed max-w-xs">
                Unified coaching platform for modern coaches. AI-powered programs,
                performance analytics, events, nutrition, and team communication.
              </p>
              <p className="mt-4 text-sm text-[#212121]">shaikhsaad256@gmail.com</p>
              <div className="flex items-center gap-4 mt-4">
                <a href="#" className="text-[#424242] hover:text-brand-primary transition-colors" aria-label="Facebook">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-[#424242] hover:text-brand-primary transition-colors" aria-label="Twitter">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-[#424242] hover:text-brand-primary transition-colors" aria-label="Instagram">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>

            {linkColumns.map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-[#111111] text-sm mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-[#212121] hover:text-brand-primary transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#212121]">
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-brand-primary transition-colors">Privacy</a>
            <span className="w-px h-4 bg-gray-300" />
            <a href="/terms" className="hover:text-brand-primary transition-colors">Terms and condition</a>
          </div>
          <div>&copy; 2024 All rights reserved. MR Training Company</div>
        </div>
      </div>
    </footer>
  );
}