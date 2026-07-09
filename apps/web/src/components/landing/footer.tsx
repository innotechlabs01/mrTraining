'use client';

import { Logo } from './logo';
import { FadeInView } from './animation-primitives';
import { ChevronRight } from 'lucide-react';

const footerLinks = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'Integrations', 'Changelog', 'Roadmap'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API Reference', 'Community', 'Blog', 'Help Center'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Press', 'Partners', 'Contact'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR', 'CCPA'],
  },
];

export function FooterSection() {
  return (
    <footer className="relative py-16 lg:py-20 bg-surface-0 border-t border-surface-4 overflow-hidden">
      <div className="section-container">
        <FadeInView>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Logo size="md" className="mb-4" />
              <p className="text-body-sm text-text-tertiary mb-4 max-w-xs">
                The unified coaching platform for modern coaches and their athletes.
              </p>
              <div className="flex gap-3">
                {['Twitter', 'LinkedIn', 'GitHub', 'YouTube'].map(s => (
                  <a
                    key={s}
                    href="#"
                    className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center text-text-tertiary hover:text-brand-primary hover:bg-surface-4 transition-all duration-300 text-body-xs font-semibold"
                  >
                    {s[0]}
                  </a>
                ))}
              </div>
            </div>

            {footerLinks.map(group => (
              <div key={group.title}>
                <h4 className="font-display font-semibold text-body-sm text-text-primary mb-4">
                  {group.title}
                </h4>
                <ul className="space-y-2.5">
                  {group.links.map(link => (
                    <li key={link}>
                      <a
                        href="#"
                        className="flex items-center gap-1 text-body-sm text-text-tertiary hover:text-text-primary transition-colors duration-200 group"
                      >
                        <ChevronRight className="w-3 h-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-surface-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-body-xs text-text-tertiary">
              &copy; {new Date().getFullYear()} MR Training. All rights reserved.
            </p>
            <p className="text-body-xs text-text-tertiary">
              Built for coaches who demand more.
            </p>
          </div>
        </FadeInView>
      </div>
    </footer>
  );
}