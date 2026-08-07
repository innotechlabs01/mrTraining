'use client';

import React, { useState, useEffect } from 'react';
import { LandingData, FALLBACK_BRAND } from '@/lib/landing';
import { Package, Book, Clock, Eye } from 'lucide-react';

async function fetchPublicProducts() {
  const res = await fetch('/api/marketing/products');
  if (!res.ok) return [];
  return res.json() as Promise<Array<{ id: string; name: string; brand?: string; imageUrl?: string; price: number; description?: string; category?: string; stock: number }>>;
}

async function fetchPublicBlogPosts() {
  const res = await fetch('/api/marketing/blog');
  if (!res.ok) return [];
  return res.json() as Promise<Array<{ id: string; slug: string; title: string; excerpt: string; category: string; imageUrl?: string; readTimeMinutes: number; views: number }>>;
}

function Icon({ name, ...rest }: { name: string } & React.SVGProps<SVGSVGElement>) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };
  switch (name) {
    case 'star':
      return (
        <svg {...common} width='15' height='15' fill='currentColor' stroke='none'>
          <polygon points='12,2 15,9 22,9.5 16.8,14.2 18.5,21 12,17.2 5.5,21 7.2,14.2 2,9.5 9,9' />
        </svg>
      );
    case 'arrow-left':
      return (
        <svg {...common} width='18' height='18'>
          <line x1='19' y1='12' x2='5' y2='12' />
          <polyline points='10,7 5,12 10,17' />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...common} width='18' height='18'>
          <line x1='5' y1='12' x2='19' y2='12' />
          <polyline points='14,7 19,12 14,17' />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common} width='22' height='22'>
          <line x1='3' y1='6' x2='21' y2='6' />
          <line x1='3' y1='12' x2='21' y2='12' />
          <line x1='3' y1='18' x2='21' y2='18' />
        </svg>
      );
    case 'close':
      return (
        <svg {...common} width='22' height='22'>
          <line x1='5' y1='5' x2='19' y2='19' />
          <line x1='19' y1='5' x2='5' y2='19' />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg {...common} width='20' height='20' fill='currentColor' stroke='none'>
          <path d='M12.04 2.01C6.5 2.01 2 6.19 2 11.36c0 1.93.49 3.79 1.41 5.37l-1.33 4.54 4.67-2.7c1.45.38 2.96.59 4.49.59 5.54 0 9.75-4.56 9.75-9.95S17.58 2.01 12.04 2.01Zm5.34 13.66c-.28.18-2.57 1.46-4.85 2.72-.18.1-.31.07-.41-.03C9.85 17.52 7.3 16.87 6.3 16.27c-.28-.18-.5-.18-.7-.19-.18-.02-1.29-.44-2.19-1.55-.24-.33-.43-.7-.43-1.14 0-.44.22-.7.59-1 .42.22 1.53.95 2.49 2.06.2.22.39.26.53.06.13-.17 1.77-2.55 2.12-2.88a.49.49 0 0 0-.06-.83c-.32.1-1.78.64-3.07 1.56a17.97 17.97 0 0 1-2.36-3c-.23-.4-.46-.41-.59-.42-.13 0-.39-.03-.59-.03a1.3 1.3 0 0 0-.95.42 1.33 1.33 0 0 0-.32.9C5.28 10.72 8.35 13.67 10.8 15c.35 0 .84.07 1.3-.18.39-.19 1.05-.58 1.49-.99s.72-.89.8-.96c.08-.07. 0-0 0 0 0 .09.17 1.35-.05 1.49Z' />
          <circle cx='12' cy='12' r='9' />
        </svg>
      );
    default:
      return null;
  }
}

function img(seed: string, w: number, h: number, alt = '') {
  return `https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=${w}&h=${h}&fit=crop`;
}

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: '#15aaf2' }}><Icon name='star' /></span>
      ))}
    </div>
  );
}

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [testiIndex, setTestiIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Array<{ id: string; name: string; brand?: string; imageUrl?: string; price: number; description?: string; category?: string; stock: number }>>([]);
  const [productsHydrated, setProductsHydrated] = useState(false);
  const [blogPosts, setBlogPosts] = useState<Array<{ id: string; slug: string; title: string; excerpt: string; category: string; imageUrl?: string; readTimeMinutes: number; views: number }>>([]);
  const [blogHydrated, setBlogHydrated] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('/api/landing')
      .then((r) => r.json())
      .then((d: LandingData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    fetchPublicProducts()
      .then((p) => { setProducts(p); setProductsHydrated(true); })
      .catch(() => setProductsHydrated(true));

    fetchPublicBlogPosts()
      .then((b) => { setBlogPosts(b); setBlogHydrated(true); })
      .catch(() => setBlogHydrated(true));
  }, []);

  const navHref = (label: string) => {
    const map: Record<string, string> = {
      Inicio: '#home',
      'Sobre MAO': '#about',
      'Asesoría Online': '/planes',
      Planes: '/planes',
       Testimonios: '#testimonials',
      Tienda: '#tienda',
      Blog: '#blog',
      Contacto: '#contact',
    };
    return map[label] || `#${label.toLowerCase().replace(/\s/g, '-')}`;
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  if (!data) {
    return <div className='flex items-center justify-center min-h-screen text-white'>Error loading landing</div>;
  }

  const brand = data.brand ?? FALLBACK_BRAND;
  const tienda = data.tienda ?? { title: 'Tienda', copy: 'Accesorios y suplementos recomendados.' };
  const blog = data.blog ?? { title: 'Blog', subtitle: 'Artículos, técnicas y progresos.' };

  return (
    <div className='ig-root'>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

        .ig-root {
          color-scheme: dark;
          --bg: #0a0a0a;
          --bg-elevated: #121212;
          --bg-card: #141414;
          --border: #2a2a2a;
          --text: #ffffff;
          --text-secondary: #9a9a9a;
          --text-muted: #6e6e6e;
          --line: #2a2a2a;
          --red: ${brand.colors.primary};
          --red-dark: #0d8bc4;
          --white: #ffffff;
          --muted: #9a9a9a;
          --muted-2: #6e6e6e;

          --font-display: 'Oswald', sans-serif;
          --font-body: 'Inter', -apple-system, sans-serif;

          background: var(--bg);
          color: var(--white);
          font-family: var(--font-body);
          line-height: 1.55;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }
        .ig-root * { box-sizing: border-box; }
        .ig-root a { color: inherit; text-decoration: none; }
        .ig-root img { display: block; max-width: 100%; }
        .ig-root :focus-visible { outline: 2px solid var(--red); outline-offset: 3px; }

        .ig-container { max-width: 1200px; margin: 0 auto; padding: 0 32px; }

        .ig-h2 {
          font-family: var(--font-display);
          font-weight: 700;
          text-transform: uppercase;
          font-size: clamp(28px, 3.8vw, 42px);
          letter-spacing: 0.01em;
          margin: 0 0 16px;
          line-height: 1.05;
        }
        .ig-h2 .accent { color: var(--red); }
        .ig-lede { color: var(--muted); font-size: 15px; margin: 0; }
        .ig-eyebrow {
          font-family: var(--font-display); font-size: 13px; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--red); margin-bottom: 10px; font-weight: 600;
        }

        .ig-btn {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 14px 26px;
          border: 1.5px solid var(--red);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background .15s ease, color .15s ease;
          background: transparent;
          color: var(--white);
        }
        .ig-btn:hover { background: rgba(21,170,242,0.12); }
        .ig-btn-solid { background: var(--red); border-color: var(--red); }
        .ig-btn-solid:hover { background: var(--red-dark); }

        .ig-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; transition: background .3s, border-color .3s, backdrop-filter .3s; border-bottom: 1px solid transparent; background: transparent; }
        .ig-nav.scrolled { background: rgba(10,10,10,0.85); backdrop-filter: blur(8px); border-bottom-color: var(--line); }
        .ig-nav-inner { display: flex; align-items: center; justify-content: space-between; height: 120px; }
        .ig-logo { font-family: var(--font-display); font-weight: 700; font-size: 20px; letter-spacing: 0.02em; text-transform: uppercase; }
        .ig-logo .accent { color: var(--red); }
        .ig-links { display: flex; gap: 30px; }
        .ig-links a { font-family: var(--font-display); font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); transition: color .15s; }
        .ig-links a.active, .ig-links a:hover { color: var(--red); }
        .ig-menu-toggle { display: none; background: none; border: none; color: var(--white); cursor: pointer; }
        .ig-mobile-menu {
          position: fixed; inset: 0; top: 120px; background: var(--bg); z-index: 49;
          padding: 30px 32px; display: flex; flex-direction: column; gap: 22px;
        }
        .ig-mobile-menu a { font-family: var(--font-display); font-size: 24px; text-transform: uppercase; }

        .ig-hero { position: relative; overflow: hidden; min-height: 640px; display: flex; align-items: flex-end; }
        .ig-hero-photo { position: absolute; inset: 0; }
        .ig-hero-photo img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; }
        .ig-hero-photo::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, var(--bg) 8%, rgba(10,10,10,0.55) 42%, rgba(10,10,10,0.15) 75%),
                      linear-gradient(0deg, var(--bg) 0%, transparent 34%);
        }
        .ig-hero-inner { position: relative; z-index: 2; padding-bottom: 60px; width: 100%; }
        .ig-hero-inner h1 {
          font-family: var(--font-display); font-weight: 700; text-transform: uppercase;
          font-size: clamp(38px, 5.6vw, 60px); line-height: 0.98; margin: 0;
        }
        .ig-hero-inner h1 .accent { color: var(--red); display: block; }
        .ig-hero-tagline { color: var(--white); font-size: 18px; max-width: 42ch; margin: 14px 0 22px; letter-spacing: -0.01em; }
        .ig-hero-stats { display: flex; gap: 0; margin-top: 30px; }
        .ig-hero-stat { padding: 0 26px; border-left: 1px solid var(--line); }
        .ig-hero-stat:first-child { padding-left: 0; border-left: none; }
        .ig-hero-stat-val { font-family: var(--font-display); font-weight: 700; color: var(--red); font-size: 26px; }
        .ig-hero-stat-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.02em; }

        .ig-section { padding: 100px 0; }
        .ig-section-head { text-align: center; max-width: 620px; margin: 0 auto 50px; }

        .ig-why { background: var(--bg-elevated); }
        .ig-reasons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
        .ig-reason { border: 1.5px solid var(--red); padding: 26px 28px; }
        .ig-reason-n { font-family: var(--font-display); font-weight: 700; font-size: 22px; margin-bottom: 14px; }
        .ig-reason-title { font-family: var(--font-display); font-weight: 600; text-transform: uppercase; color: var(--red); font-size: 15px; letter-spacing: 0.02em; margin: 0 0 10px; }
        .ig-reason-copy { color: var(--muted); font-size: 13.5px; margin: 0; }

        .ig-exp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .ig-exp-text p { color: var(--muted); font-size: 14px; margin: 0 0 16px; }
        .ig-exp-photo { position: relative; }
        .ig-exp-photo::before {
          content: ''; position: absolute; top: -22px; right: -22px; width: 100%; height: 100%;
          border: 1.5px solid var(--red); z-index: 0;
        }
        .ig-exp-photo img { position: relative; z-index: 1; width: 100%; height: 400px; object-fit: cover; filter: grayscale(0.3); }

        .ig-testi { background: var(--bg-elevated); text-align: center; }
        .ig-testi-quote { max-width: 720px; margin: 0 auto 20px; color: var(--muted); font-size: 15px; }
        .ig-testi-name { font-family: var(--font-display); font-weight: 600; text-transform: uppercase; font-size: 15px; margin-top: 18px; }
        .ig-testi-avatar { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; margin: 12px auto 0; border: 2px solid var(--red); }
        .ig-testi-nav { display: flex; align-items: center; justify-content: center; gap: 40px; margin-top: 10px; }
        .ig-testi-nav button { background: none; border: none; color: var(--white); cursor: pointer; opacity: 0.7; }
        .ig-testi-nav button:hover { opacity: 1; color: var(--red); }

        .ig-dots { display: flex; justify-content: center; gap: 8px; margin-top: 34px; }
        .ig-dots button { width: 7px; height: 7px; border-radius: 50%; border: none; background: var(--line); cursor: pointer; padding: 0; }
         .ig-dots button.active { background: var(--red); width: 22px; border-radius: 4px; }

         .ig-product-card {
           background: var(--surface);
           border: 1px solid var(--line);
           border-radius: 12px;
           overflow: hidden;
           transition: transform .15s, border-color .15s;
         }
         .ig-product-card:hover { transform: translateY(-2px); border-color: var(--red); }
         .ig-product-img { width: 100%; height: 140px; object-fit: cover; }
         .ig-product-body { padding: 14px; }
         .ig-product-name { font-family: var(--font-display); font-size: 14px; font-weight: 600; margin: 0 0 4px; }
         .ig-product-brand { display: block; font-size: 11px; color: var(--muted); margin-bottom: 2px; }
         .ig-product-category { display: inline-block; font-size: 10px; background: var(--red)/10; color: var(--red); padding: 2px 8px; border-radius: 10px; margin-bottom: 6px; }
         .ig-product-desc { font-size: 11.5px; color: var(--muted); margin: 4px 0; line-height: 1.4; }
         .ig-product-price { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--red); margin: 8px 0; }
         .ig-stock-badge { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
         .ig-in-stock { background: var(--green)/10; color: var(--green); }
         .ig-out-of-stock { background: var(--muted)/20; color: var(--muted); }

         .ig-blog-card {
           background: var(--surface);
           border: 1px solid var(--line);
           border-radius: 12px;
           overflow: hidden;
           transition: transform .15s, border-color .15s;
           text-decoration: none; color: inherit; display: flex; flex-direction: column;
         }
         .ig-blog-card:hover { transform: translateY(-2px); border-color: var(--red); }
         .ig-blog-img { width: 100%; height: 140px; object-fit: cover; }
         .ig-blog-body { padding: 14px; flex: 1; display: flex; flex-direction: column; }
         .ig-blog-category { font-size: 10px; background: var(--red)/10; color: var(--red); padding: 2px 8px; border-radius: 10px; width: fit; margin-bottom: 8px; }
         .ig-blog-title { font-family: var(--font-display); font-size: 14px; font-weight: 600; margin: 0 0 6px; }
         .ig-blog-excerpt { font-size: 12px; color: var(--muted); margin: 0 0 8px; flex: 1; line-height: 1.5; }
         .ig-blog-meta { display: flex; gap: 12px; font-size: 11px; color: var(--muted); }
         .ig-blog-meta span { display: inline-flex; align-items: center; gap: 3px; }

         .ig-grid { display: grid; gap: 24px; }

         .ig-contact-grid { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 60px; }
        .ig-contact-info h3 { font-family: var(--font-display); font-weight: 700; font-size: 26px; margin: 0 0 16px; }
        .ig-contact-info .ig-contact-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; color: var(--muted); font-size: 14px; }
        .ig-contact-info .ig-contact-row strong { color: var(--white); font-weight: 600; }
        .ig-contact-info a.social { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); margin-right: 16px; font-size: 13px; transition: color .15s; }
        .ig-contact-info a.social:hover { color: var(--red); }

        .ig-footer { padding: 50px 0 26px; text-align: center; border-top: 1px solid var(--line); }
        .ig-footer .ig-logo { font-size: 22px; margin-bottom: 22px; display: inline-block; }
        .ig-footer-logo { display: flex; justify-content: center; margin-bottom: 22px; }
        .ig-footer-logo img { height: 80px; width: auto; opacity: 0.85; filter: drop-shadow(0 0 18px rgba(21,170,242,0.3)); }
        .ig-footer-links { display: flex; gap: 30px; justify-content: center; margin-bottom: 30px; flex-wrap: wrap; }
        .ig-footer-links a { font-family: var(--font-display); font-size: 12.5px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
        .ig-footer-links a.active, .ig-footer-links a:hover { color: var(--red); }
        .ig-footer-bottom {
          border-top: 1px solid var(--line); padding-top: 20px; display: flex; justify-content: space-between;
          color: var(--muted-2); font-size: 12px; flex-wrap: wrap; gap: 10px;
        }

        @media (max-width: 980px) {
          .ig-reasons-grid { grid-template-columns: 1fr; }
          .ig-exp-grid, .ig-contact-grid { grid-template-columns: 1fr; gap: 40px 0; }
          .ig-exp-photo { order: -1; }
          .ig-hero { min-height: 480px; }
          .ig-hero-stats { flex-wrap: wrap; row-gap: 16px; }
        }
        @media (max-width: 680px) {
          .ig-container { padding: 0 16px; }
          .ig-links { display: none; }
          .ig-menu-toggle { display: block; }
          .ig-nav .ig-btn-solid { display: none; }
          .ig-hero { min-height: 400px; }
          .ig-hero-inner h1 { font-size: clamp(28px, 8vw, 42px); }
          .ig-section { padding: 56px 0; }
          .ig-section-head { margin-bottom: 32px; }
          .ig-exp-photo img { height: 280px; }
          .ig-footer { padding: 32px 0 18px; }
          .ig-footer-bottom { flex-direction: column; text-align: center; }
        }
      `}</style>

      <header className={`ig-nav${scrolled ? ' scrolled' : ''}`}>
        <div className='ig-container ig-nav-inner'>
          <a href='#' className='ig-logo' style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src='/images/icon/icon_mr_rp.png' alt='MR Training' style={{ height: 100, width: 'auto' }} />
          </a>
          <nav className='ig-links'>
            {data.navLinks.map((l) => (
              <a key={l} href={navHref(l)} className={l === 'Inicio' ? 'active' : ''}>
                {l}
              </a>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href='/planes' className='ig-btn ig-btn-solid'>Ver Planes</a>
            <button
              className='ig-menu-toggle'
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
      </header>

      <div style={{ height: 120 }} />

      {menuOpen && (
        <div className='ig-mobile-menu'>
          {data.navLinks.map((l) => (
            <a key={l} href={navHref(l)} onClick={() => setMenuOpen(false)}>{l}</a>
          ))}
        </div>
      )}

      <section className='ig-hero' id='home'>
        <div className='ig-hero-photo'>
          <img src={brand.heroPhoto} alt={brand.heroPhotoAlt} />
        </div>
        <div className='ig-container ig-hero-inner'>
          <h1>
            Entrena con<span className='accent'> Mao</span>
          </h1>
          <p className='ig-hero-tagline'>
            {brand.heroSubtitle}
          </p>
          <div className='ig-hero-stats'>
            {data.stats.map((s) => (
              <div className='ig-hero-stat' key={s.label}>
                <div className='ig-hero-stat-val'>{s.value}</div>
                <div className='ig-hero-stat-label'>{s.label}</div>
              </div>
            ))}
          </div>
          <a href='/planes' className='ig-btn ig-btn-solid' style={{ marginTop: 30 }}>
            Ver Planes
          </a>
        </div>
      </section>

      <section className='ig-section ig-why'>
        <div className='ig-container'>
          <div className='ig-section-head'>
            <h2 className='ig-h2'><span className='accent'>Cómo</span> Entrenamos</h2>
            <p className='ig-lede'>
              No hay plantillas genéricas. Cada decisión se toma para ti.
            </p>
          </div>
          <div className='ig-reasons-grid'>
            {data.reasons.map((r) => (
              <div className='ig-reason' key={r.n}>
                <div className='ig-reason-n'>{r.n}</div>
                <h3 className='ig-reason-title'>{r.title}</h3>
                <p className='ig-reason-copy'>{r.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='ig-section' id='about'>
        <div className='ig-container ig-exp-grid'>
          <div className='ig-exp-text'>
            <div className='ig-eyebrow'>{brand.aboutTitle}</div>
            {brand.aboutCopy.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className='ig-exp-photo'>
            <img src={brand.aboutPhoto} alt={brand.aboutPhotoAlt} />
          </div>
        </div>
      </section>

      <section className='ig-section ig-testi' id='testimonials'>
        <div className='ig-container'>
          <h2 className='ig-h2'>Lo que <span className='accent'>dicen</span> mis atletas</h2>
          <p className='ig-testi-quote'>&ldquo;{data.testimonials[testiIndex]?.quote}&rdquo;</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}><Stars /></div>
          <div className='ig-testi-name'>{data.testimonials[testiIndex]?.name}</div>
          <img className='ig-testi-avatar' src={`https://i.pravatar.cc/120?img=${testiIndex + 20}`} alt={data.testimonials[testiIndex]?.name} />
          <div className='ig-testi-nav'>
            <button
              onClick={() => setTestiIndex((i) => (i - 1 + data.testimonials.length) % data.testimonials.length)}
              aria-label='Previous testimonial'
            >
              <Icon name='arrow-left' />
            </button>
            <button
              onClick={() => setTestiIndex((i) => (i + 1) % data.testimonials.length)}
              aria-label='Next testimonial'
            >
              <Icon name='arrow-right' />
            </button>
          </div>
          <div className='ig-dots'>
            {data.testimonials.map((_, i) => (
              <button
                key={i}
                className={i === testiIndex ? 'active' : ''}
                onClick={() => setTestiIndex(i)}
                aria-label={`Show testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="ig-section" id="tienda">
        <div className="ig-container">
          <h2 className="ig-section-title">{tienda.title}</h2>
          <p className="ig-section-subtitle" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 40px' }}>{tienda.copy}</p>

          {!productsHydrated ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-var(--red)" />
            </div>
          ) : products.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>Próximamente productos en la tienda.</p>
          ) : (
            <div className="ig-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
              {products.map((product) => (
                <div key={product.id} className="ig-card ig-product-card">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="ig-product-img" />
                  ) : (
                    <div className="ig-product-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                      <Package size={24} />
                    </div>
                  )}
                  <div className="ig-product-body">
                    <h3 className="ig-product-name">{product.name}</h3>
                    {product.brand && <span className="ig-product-brand">{product.brand}</span>}
                    {product.category && <span className="ig-product-category">{product.category}</span>}
                    {product.description && <p className="ig-product-desc">{product.description}</p>}
                    <div className="ig-product-price">${product.price.toFixed(2)}</div>
                    <span className={product.stock > 0 ? 'ig-stock-badge ig-in-stock' : 'ig-stock-badge ig-out-of-stock'}>
                      {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="ig-section" id="blog">
        <div className="ig-container">
          <h2 className="ig-section-title">{blog.title}</h2>
          <p className="ig-section-subtitle" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 40px' }}>{blog.subtitle}</p>

          {!blogHydrated ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-var(--red)" />
            </div>
          ) : blogPosts.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>Próximamente contenido en el blog.</p>
          ) : (
            <div className="ig-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {blogPosts.map((post) => (
                <a key={post.id} href={`/blog/${post.slug}`} className="ig-card ig-blog-card">
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt={post.title} className="ig-blog-img" />
                  ) : (
                    <div className="ig-blog-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                      <Book size={24} />
                    </div>
                  )}
                  <div className="ig-blog-body">
                    <span className="ig-blog-category">{post.category}</span>
                    <h3 className="ig-blog-title">{post.title}</h3>
                    <p className="ig-blog-excerpt">{post.excerpt}</p>
                    <div className="ig-blog-meta">
                      <span><Clock size={12} /> {post.readTimeMinutes} min</span>
                      <span><Eye size={12} /> {post.views} lecturas</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className='ig-section' id='contact'>
        <div className='ig-container'>
          <div className='ig-section-head'>
            <h2 className='ig-h2'>Comencemos <span className='accent'>hoy</span></h2>
            <p className='ig-lede'>
              Contáctame por WhatsApp o email. Te respondo en menos de 24 horas.
            </p>
          </div>
          <div className='ig-contact-grid'>
            <div className='ig-contact-info'>
              <h3>Datos de contacto</h3>
              <div className='ig-contact-row'>
                <Icon name='whatsapp' />
                <span><strong>WhatsApp:</strong> {brand.contact.city.split(',')[0]}</span>
              </div>
              <div className='ig-contact-row'>
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8c0-1.1.9-2 2-2h12L9 4 4 9z' /></svg>
                <span><strong>Email:</strong> {brand.contact.email}</span>
              </div>
              <div className='ig-contact-row'>
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='12' cy='12' r='10'/><line x1='12' y1='16' x2='12' y2='12'/><line x1='12' y1='8' x2='12.01' y2='8'/></svg>
                <span><strong>Ubícación:</strong> {brand.contact.city}</span>
              </div>
              <div className='ig-contact-row' style={{ marginTop: 16 }}>
                {brand.contact.socialLinks.map((s) => (
                  <a key={s.label} href={s.href} className='social'>{s.label}</a>
                ))}
              </div>
            </div>
            <form
              className='ig-form'
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const qs = new URLSearchParams({
                  nombre: fd.get('nombre') as string,
                  email: fd.get('email') as string,
                  mensaje: fd.get('mensaje') as string,
                }).toString();
                window.location.href = `mailto:${brand.contact.email}?subject=Consulta MR Training&body=${encodeURIComponent(qs)}`;
              }}
            >
              <input type='text' name='nombre' placeholder='Tu nombre' required />
              <input type='email' name='email' placeholder='Tu email' required />
              <textarea name='mensaje' placeholder='¿Qué te gustaría mejorar?' rows={4} required style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', padding: '13px 16px', fontFamily: 'var(--font-body)', fontSize: '13.5px', resize: 'vertical' }} />
              <button type='submit' className='ig-btn ig-btn-solid' style={{ justifySelf: 'start' }}>
                Enviar mensaje
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className='ig-footer'>
        <div className='ig-container'>
          <div className='ig-footer-logo'>
            <img src='/images/icon/icon_mr_rp_wapp.png' alt='MR Training' />
          </div>
          <nav className='ig-footer-links'>
            {data.navLinks.map((l) => (
              <a key={l} href={navHref(l)} className={l === 'Inicio' ? 'active' : ''}>
                {l}
              </a>
            ))}
          </nav>
          <div className='ig-footer-bottom'>
            <span>Privacidad &nbsp;|&nbsp; Términos y condiciones</span>
            <span>&copy; {new Date().getFullYear()} Todos los derechos reservados. MR Training</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
