'use client';

import { useI18n } from '@/features/shared/hooks/useI18n';
import { MenuIcon, CloseIcon } from './icons';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useState } from 'react';
import { SignInButton } from './SignInButton';

const LOGO = '/images/icon/icon_mr_rp_wapp.png';

const LINKS = [
  { href: '/', key: 'home' },
  { href: '/#asesoria', key: 'asesoria' },
  { href: '/planes', key: 'plans' },
  { href: '/#tienda', key: 'store' },
  { href: '/#contact', key: 'contact' },
] as const;

export function Header({ activeKey }: { activeKey?: string }) {
  const { t } = useI18n('common');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="ig-nav scrolled">
        <div className="ig-container ig-nav-inner">
          <Link href="/" className="ig-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="MR Training" style={{ height: 84, width: 'auto' }} />
          </Link>
          <nav className="ig-links" aria-label="MR Training">
            {LINKS.map((item) => (
              <Link key={item.href} href={item.href} className={item.key === activeKey ? 'active' : ''}>
                {t(`landing.nav.${item.key}`)}
              </Link>
            ))}
          </nav>
          <div className="ig-nav-actions">
            <LanguageSwitcher />
            <SignInButton />
          </div>
          <button
            className="ig-menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? t('landing.menu.close') : t('landing.menu.open')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>
      {menuOpen && (
        <nav className="ig-mobile-menu" aria-label="MR Training">
          {LINKS.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              {t(`landing.nav.${item.key}`)}
            </Link>
          ))}
          <LanguageSwitcher />
          <SignInButton onNavigate={() => setMenuOpen(false)} />
        </nav>
      )}
    </>
  );
}