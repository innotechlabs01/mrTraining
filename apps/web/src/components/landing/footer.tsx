'use client';

import { Logo } from './logo';
import { FadeInView } from './animation-primitives';
import { ChevronRight } from 'lucide-react';
import { useLang } from './i18n';
import { Twitter, Github, Youtube, Linkedin } from 'lucide-react';

const esLinks = [
  {
    title: 'Producto',
    links: ['Funcionalidades', 'Precios', 'Integraciones', 'Cambios', 'Ruta'],
  },
  {
    title: 'Recursos',
    links: ['Documentación', 'API', 'Comunidad', 'Blog', 'Centro de ayuda'],
  },
  {
    title: 'Empresa',
    links: ['Nosotros', 'Empleo', 'Prensa', 'Socios', 'Contacto'],
  },
  {
    title: 'Legal',
    links: ['Privacidad', 'Términos', 'Cookies', 'GDPR', 'CCPA'],
  },
];

const enLinks = [
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

const socialLinks = [
  { icon: Twitter, href: 'https://x.com/mrtraining', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/mrtraining', label: 'LinkedIn' },
  { icon: Github, href: 'https://github.com/mrtraining', label: 'GitHub' },
  { icon: Youtube, href: 'https://youtube.com/@mrtraining', label: 'YouTube' },
];

export function FooterSection() {
  const { es } = useLang();
  const l = es ? esLinks : enLinks;

  return (
    <footer className="relative py-16 lg:py-20 bg-surface-0 border-t border-surface-4 overflow-hidden">
      <div className="section-container">
        <FadeInView>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Logo size="md" className="mb-4" />
              <p className="text-body-sm text-text-tertiary mb-4 max-w-xs">
                {es
                  ? 'La plataforma de entrenamiento unificada para deportistas modernos.'
                  : 'The unified training platform for modern athletes.'}
              </p>
              <div className="flex gap-3">
                {socialLinks.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center text-text-tertiary hover:text-brand-primary hover:bg-surface-4 transition-all duration-300"
                  >
                    <s.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {l.map(group => (
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
              &copy; {new Date().getFullYear()} MR Training. {es ? 'Todos los derechos reservados.' : 'All rights reserved.'}
            </p>
            <p className="text-body-xs text-text-tertiary">
              {es ? 'Hecho para bestias que nunca se rinden.' : 'Built for beasts who never quit.'}
            </p>
          </div>
        </FadeInView>
      </div>
    </footer>
  );
}
