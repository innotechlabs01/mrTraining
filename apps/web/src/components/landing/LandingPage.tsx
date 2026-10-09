'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/features/shared/hooks/useI18n';
import { CloseIcon, MenuIcon } from './icons';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SignInButton } from './SignInButton';
import {
  AboutSection,
  AsesoriaSection,
  BlogSection,
  PlansSection,
  StoreSection,
  TestimonialsSection,
  WhySection,
} from './Sections';
import { ContactSection } from './Contact';
import './landing.css';
import type { BlogPost, LandingData, Plan, Product } from './data';
import {
  FALLBACK_BRAND_ACCENT,
  FALLBACK_HERO_TAGLINE,
  FALLBACK_STATS,
  fetchLanding,
  fetchPublicBlogPosts,
  fetchPublicPlans,
  fetchPublicProducts,
  pick,
} from './data';

const NAV_ITEMS = [
  { id: 'home', key: 'home' },
  { id: 'about', key: 'about' },
  { id: 'asesoria', key: 'asesoria' },
  { id: 'planes', key: 'plans' },
  { id: 'testimonials', key: 'testimonials' },
  { id: 'tienda', key: 'store' },
  { id: 'blog', key: 'blog' },
  { id: 'contact', key: 'contact' },
] as const;

const LOGO = '/images/icon/icon_mr_rp_wapp.png';
const HERO_OUTLINE = '/images/icon/icon_mr_rp.png';

export default function LandingPage() {
  const { t } = useI18n('common');
  const [data, setData] = useState<LandingData | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [products, setProducts] = useState<Product[]>([]);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [blogHydrated, setBlogHydrated] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansHydrated, setPlansHydrated] = useState(false);
  const [testiIndex, setTestiIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchLanding().then((landing) => {
      if (cancelled) return;
      setData(landing);
      setLoadState(landing ? 'ready' : 'error');
    });
    fetchPublicProducts().then((items) => {
      if (cancelled) return;
      setProducts(items);
      setStoreHydrated(true);
    });
    fetchPublicBlogPosts().then((items) => {
      if (cancelled) return;
      setPosts(items);
      setBlogHydrated(true);
    });
    fetchPublicPlans().then((items) => {
      if (cancelled) return;
      setPlans(items);
      setPlansHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const testimonials = Array.isArray(data?.testimonials) ? data.testimonials : [];
  const goPrev = () => setTestiIndex((i) => (testimonials.length ? (i - 1 + testimonials.length) % testimonials.length : 0));
  const goNext = () => setTestiIndex((i) => (testimonials.length ? (i + 1) % testimonials.length : 0));

  const accent = data?.brand?.colors?.primary || FALLBACK_BRAND_ACCENT;
  const brand = data?.brand;
  const brandAccentStyle = { '--red': accent } as React.CSSProperties;

  if (loadState === 'loading') {
    return (
      <main className="ig-root">
        <div className="ig-loading" style={{ minHeight: '100vh', alignItems: 'center' }}>
          <div className="ig-spinner" role="status" aria-label={t('landing.loading')} />
        </div>
      </main>
    );
  }

  if (loadState === 'error' || !data || !brand) {
    return (
      <main className="ig-root">
        <nav className="ig-nav">
          <div className="ig-container ig-nav-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a href="#home" className="ig-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HERO_OUTLINE} alt="MR Training" style={{ height: 84, width: 'auto' }} />
            </a>
          </div>
        </nav>
        <div className="ig-loading" style={{ minHeight: '100vh', alignItems: 'center' }}>
          <p className="ig-empty">{t('landing.error')}</p>
        </div>
      </main>
    );
  }

  const tagline = pick(brand.heroSubtitle, FALLBACK_HERO_TAGLINE, t('landing.hero.tagline'));
  const stats = Array.isArray(data.stats) ? data.stats : FALLBACK_STATS;
  const heroAccent = { '--red': accent } as React.CSSProperties;

  return (
    <div className="ig-root" style={brandAccentStyle}>
      {/* N A V */}
      <header className={`ig-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="ig-container ig-nav-inner">
          <a href="#home" className="ig-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_OUTLINE} alt="MR Training" style={{ height: 84, width: 'auto' }} />
          </a>
          <nav className="ig-links" aria-label="MR Training">
            {NAV_ITEMS.map((item) => (
              <a key={item.id} href={`#${item.id}`}>
                {t(`landing.nav.${item.key}`)}
              </a>
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
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={`#${item.id}`} onClick={() => setMenuOpen(false)}>
              {t(`landing.nav.${item.key}`)}
            </a>
          ))}
          <LanguageSwitcher />
          <SignInButton onNavigate={() => setMenuOpen(false)} />
        </nav>
      )}

      <main>
        {/* H E R O */}
        <section className="ig-hero" id="home" style={heroAccent}>
          <div className="ig-hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.heroPhoto} alt={brand.heroPhotoAlt} />
          </div>
          <div className="ig-hero-outline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="" />
          </div>
          <div className="ig-container ig-hero-inner">
            <h1>
              {t('landing.hero.titleLine')} <span className="accent">{t('landing.hero.titleAccent')}</span>
            </h1>
            <p className="ig-hero-tagline">{tagline}</p>
            <div className="ig-hero-stats">
              {stats.map((stat, i) => {
                const fb = FALLBACK_STATS[i];
                const value = fb ? pick(stat.value, fb.value, t(`landing.hero.stats.${i}.value`)) : stat.value;
                const label = fb ? pick(stat.label, fb.label, t(`landing.hero.stats.${i}.label`)) : stat.label;
                return (
                  <div className="ig-hero-stat" key={i}>
                    <div className="ig-hero-stat-val">{value}</div>
                    <div className="ig-hero-stat-label">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <WhySection reasons={data.reasons} />

        <AboutSection brand={brand} />

        <AsesoriaSection />

        <PlansSection plans={plans} hydrated={plansHydrated} />

        <TestimonialsSection
          testimonials={testimonials}
          index={testiIndex}
          onPrev={goPrev}
          onNext={goNext}
          onSelect={setTestiIndex}
        />

        <StoreSection products={products} hydrated={storeHydrated} />

        <BlogSection posts={posts} hydrated={blogHydrated} />

        <ContactSection contact={brand.contact} />
      </main>

      {/* F O O T E R */}
      <footer className="ig-footer">
        <div className="ig-container">
          <div className="ig-footer-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="MR Training" />
          </div>
          <ul className="ig-footer-links">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{t(`landing.nav.${item.key}`)}</a>
              </li>
            ))}
          </ul>
          <div className="ig-footer-bottom">
            <span>{t('landing.footer.legal')}</span>
            <span>{t('landing.footer.rights', { year: new Date().getFullYear() })}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}