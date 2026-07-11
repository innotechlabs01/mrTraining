'use client';

import { Dumbbell, Phone, Mail, Facebook, Twitter, Instagram } from 'lucide-react';

const linkColumns = [
  {
    title: 'Quick Links',
    links: ['Home', 'About Us', 'Services', 'Contact'],
  },
  {
    title: 'Programs',
    links: ['Strength', 'Cardio', 'Yoga', 'Boxing'],
  },
  {
    title: 'Support',
    links: ['FAQ', 'Privacy', 'Terms', 'Help'],
  },
  {
    title: 'More',
    links: ['Blog', 'Careers', 'Gallery', 'Events'],
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
              <a href="#home" className="flex items-center gap-2 text-[#212121]">
                <Dumbbell className="w-7 h-7 text-brand-primary" />
                <span className="text-lg font-bold">
                  Iron<span className="text-brand-primary">Gym</span>
                </span>
              </a>
              <p className="mt-4 text-sm text-[#212121] leading-relaxed max-w-xs">
                Empowering your fitness journey with expert coaching, world-class equipment, and
                a supportive community.
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
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-[#212121] hover:text-brand-primary transition-colors"
                      >
                        {link}
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
            <a href="#" className="hover:text-brand-primary transition-colors">Privacy</a>
            <span className="w-px h-4 bg-gray-300" />
            <a href="#" className="hover:text-brand-primary transition-colors">Terms and condition</a>
          </div>
          <div>&copy; 2024 All rights reserved. IronGym Company</div>
        </div>
      </div>
    </footer>
  );
}
