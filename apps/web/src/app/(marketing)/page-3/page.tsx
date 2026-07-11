'use client';

import React, { useState, useEffect } from "react";

/* -------------------------------------------------------------------------
   IRONGYM — hardcore strength gym landing page (Unsplash images)
   Black background, red accent, condensed poster typography, bordered
   numbered cards, trainer + testimonial carousels.
-------------------------------------------------------------------------- */

function img(seed: string, w: number, h: number) {
  const unsplashMap: Record<string, string> = {
    "irongym-hero": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1400&h=900&fit=crop",
    "irongym-experience": "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=700&h=700&fit=crop",
    "irongym-final": "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&h=700&fit=crop",
    "ig-trainer-1": "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&h=460&fit=crop",
    "ig-trainer-2": "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&h=460&fit=crop",
    "ig-trainer-3": "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400&h=460&fit=crop",
    "ig-trainer-4": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=460&fit=crop",
    "ig-trainer-5": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=460&fit=crop",
    "ig-testi-1": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
    "ig-testi-2": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop",
    "ig-testi-3": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop",
  };
  if (unsplashMap[seed]) return unsplashMap[seed];
  return `https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=${w}&h=${h}&fit=crop`;
}

const NAV_LINKS = ["Home", "Service", "Trainers", "Testimonial", "Coaching", "Contact Us"];

const STATS = [
  { value: "20+", label: "Years of Experience" },
  { value: "15K+", label: "Members Join" },
  { value: "14K+", label: "Happy Members" },
];

const REASONS = [
  {
    n: "01",
    title: "Personal Training",
    copy: "Our gyms offer personalized training sessions with certified personal trainers who create custom workout plans based on your goals.",
  },
  {
    n: "02",
    title: "Equipment and Facilities",
    copy: "Full racks, free weights, and cardio machines, serviced year-round and updated as soon as something wears out.",
  },
  {
    n: "03",
    title: "Nutrition Counseling",
    copy: "One-on-one nutrition guidance that fits your training block, not a generic sheet handed out at sign-up.",
  },
  {
    n: "04",
    title: "Speciality Programs",
    copy: "Powerlifting, bodybuilding prep, and sport-specific conditioning blocks run by coaches who compete themselves.",
  },
];

const TRAINERS = [
  { name: "Borney Exiteid", seed: "ig-trainer-1" },
  { name: "Elsa Windia", seed: "ig-trainer-2" },
  { name: "Georege Aryo", seed: "ig-trainer-3" },
  { name: "Mika Thornton", seed: "ig-trainer-4" },
  { name: "Priya Sharma", seed: "ig-trainer-5" },
];

const TESTIMONIALS = [
  {
    quote: "I am extremely grateful for the positive impact gym training has had on my life; through consistent training and expert guidance from coaches, I've witnessed a remarkable transformation in strength, endurance, and overall fitness.",
    name: "Jhony Breaker",
    seed: "ig-testi-1",
  },
  {
    quote: "The coaches here don't let you coast. Every session has a plan, and every plan gets adjusted based on how last week actually went.",
    name: "Maria Ortiz",
    seed: "ig-testi-2",
  },
  {
    quote: "Six months ago I couldn't do a single pull-up. The specialty program got me to five clean reps, and I'm still counting.",
    name: "Dev Patel",
    seed: "ig-testi-3",
  },
];

function Icon({ name, ...rest }: { name: string } & React.SVGProps<SVGSVGElement>) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
  switch (name) {
    case "star":
      return (
        <svg {...common} width="15" height="15" fill="currentColor" stroke="none">
          <polygon points="12,2 15,9 22,9.5 16.8,14.2 18.5,21 12,17.2 5.5,21 7.2,14.2 2,9.5 9,9" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...common} width="18" height="18">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="10,7 5,12 10,17" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common} width="18" height="18">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="14,7 19,12 14,17" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common} width="22" height="22">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );
    case "close":
      return (
        <svg {...common} width="22" height="22">
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </svg>
      );
    default:
      return null;
  }
}

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: "#15aaf2" }}><Icon name="star" /></span>
      ))}
    </div>
  );
}

export default function Page3() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [trainerStart, setTrainerStart] = useState(0);
  const [testiIndex, setTestiIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const visibleTrainers = [0, 1, 2].map((i) => TRAINERS[(trainerStart + i) % TRAINERS.length]);
  const testimonial = TESTIMONIALS[testiIndex];

  return (
    <div className="ig-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

        .ig-root {
          --bg: #0a0a0a;
          --bg-elevated: #121212;
          --bg-card: #141414;
          --line: #2a2a2a;
          --red: #15aaf2;
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
        .ig-btn:hover { background: rgba(224,32,26,0.12); }
        .ig-btn-solid { background: var(--red); border-color: var(--red); }
        .ig-btn-solid:hover { background: var(--red-dark); }

        /* ---------- nav ---------- */
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

        /* ---------- hero ---------- */
        .ig-hero { position: relative; overflow: hidden; min-height: 640px; display: flex; align-items: flex-end; }
        .ig-hero-photo { position: absolute; inset: 0; }
        .ig-hero-photo img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; }
        .ig-hero-photo::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, var(--bg) 8%, rgba(10,10,10,0.55) 42%, rgba(10,10,10,0.15) 75%),
                      linear-gradient(0deg, var(--bg) 0%, transparent 34%);
        }
        .ig-hero-outline {
          position: absolute; top: -60px; right: 2%;
          z-index: 51; user-select: none; pointer-events: none;
        }
        .ig-hero-outline img {
          height: clamp(180px, 28vw, 380px); width: auto;
          mix-blend-mode: screen; opacity: 1;
        }
        .ig-hero-inner { position: relative; z-index: 2; padding-bottom: 60px; width: 100%; }
        .ig-hero-inner h1 {
          font-family: var(--font-display); font-weight: 700; text-transform: uppercase;
          font-size: clamp(38px, 5.6vw, 60px); line-height: 0.98; margin: 0;
        }
        .ig-hero-inner h1 .accent { color: var(--red); display: block; }
        .ig-hero-copy { color: var(--muted); font-size: 14.5px; max-width: 40ch; margin: 18px 0 26px; }
        .ig-hero-stats { display: flex; gap: 0; margin-top: 40px; }
        .ig-hero-stat { padding: 0 26px; border-left: 1px solid var(--line); }
        .ig-hero-stat:first-child { padding-left: 0; border-left: none; }
        .ig-hero-stat-val { font-family: var(--font-display); font-weight: 700; color: var(--red); font-size: 26px; }
        .ig-hero-stat-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.02em; }

        /* ---------- section base ---------- */
        .ig-section { padding: 100px 0; }
        .ig-section-head { text-align: center; max-width: 620px; margin: 0 auto 50px; }

        /* ---------- why choose us ---------- */
        .ig-why { background: var(--bg-elevated); }
        .ig-reasons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
        .ig-reason { border: 1.5px solid var(--red); padding: 26px 28px; }
        .ig-reason-n { font-family: var(--font-display); font-weight: 700; font-size: 22px; margin-bottom: 14px; }
        .ig-reason-title { font-family: var(--font-display); font-weight: 600; text-transform: uppercase; color: var(--red); font-size: 15px; letter-spacing: 0.02em; margin: 0 0 10px; }
        .ig-reason-copy { color: var(--muted); font-size: 13.5px; margin: 0; }

        /* ---------- experience ---------- */
        .ig-exp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .ig-exp-text p { color: var(--muted); font-size: 14px; margin: 0 0 16px; }
        .ig-exp-photo { position: relative; }
        .ig-exp-photo::before {
          content: ''; position: absolute; top: -22px; right: -22px; width: 100%; height: 100%;
          border: 1.5px solid var(--red); z-index: 0;
        }
        .ig-exp-photo img { position: relative; z-index: 1; width: 100%; height: 400px; object-fit: cover; filter: grayscale(0.3); }

        /* ---------- trainers ---------- */
        .ig-trainer-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .ig-trainer-card { border: 1px solid var(--line); }
        .ig-trainer-card img { width: 100%; height: 260px; object-fit: cover; }
        .ig-trainer-body { padding: 18px 20px 22px; text-align: center; }
        .ig-trainer-name { font-family: var(--font-display); font-weight: 600; text-transform: uppercase; font-size: 16px; margin: 0 0 8px; }
        .ig-trainer-rate { font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
        .ig-trainer-stars { display: flex; justify-content: center; gap: 3px; }
        .ig-dots { display: flex; justify-content: center; gap: 8px; margin-top: 34px; }
        .ig-dots button { width: 7px; height: 7px; border-radius: 50%; border: none; background: var(--line); cursor: pointer; padding: 0; }
        .ig-dots button.active { background: var(--red); width: 22px; border-radius: 4px; }

        /* ---------- testimonials ---------- */
        .ig-testi { background: var(--bg-elevated); text-align: center; }
        .ig-testi-quote { max-width: 720px; margin: 0 auto 20px; color: var(--muted); font-size: 15px; }
        .ig-testi-name { font-family: var(--font-display); font-weight: 600; text-transform: uppercase; font-size: 15px; margin-top: 18px; }
        .ig-testi-avatar { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; margin: 12px auto 0; border: 2px solid var(--red); }
        .ig-testi-nav { display: flex; align-items: center; justify-content: center; gap: 40px; margin-top: 10px; }
        .ig-testi-nav button { background: none; border: none; color: var(--white); cursor: pointer; opacity: 0.7; }
        .ig-testi-nav button:hover { opacity: 1; color: var(--red); }

        /* ---------- final cta ---------- */
        .ig-final { padding: 100px 0; }
        .ig-final-box { border: 1.5px dashed var(--red); padding: 50px; display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 50px; align-items: center; }
        .ig-final-photo { position: relative; }
        .ig-final-photo::before { content: ''; position: absolute; inset: -14px; border: 1.5px solid var(--red); z-index: 0; }
        .ig-final-photo img { position: relative; z-index: 1; width: 100%; height: 420px; object-fit: cover; }
        .ig-final-copy { color: var(--muted); font-size: 14px; margin: 16px 0 26px; }
        .ig-form { display: flex; flex-direction: column; gap: 14px; max-width: 420px; }
        .ig-form-row { display: flex; gap: 14px; }
        .ig-form input {
          background: transparent; border: 1px solid var(--line); color: var(--white);
          padding: 13px 16px; font-family: var(--font-body); font-size: 13.5px; flex: 1; width: 100%;
        }
        .ig-form input::placeholder { color: var(--muted-2); }
        .ig-form input:focus { outline: none; border-color: var(--red); }

        /* ---------- footer ---------- */
        .ig-footer { padding: 50px 0 26px; text-align: center; border-top: 1px solid var(--line); }
        .ig-footer .ig-logo { font-size: 22px; margin-bottom: 22px; display: inline-block; }
        .ig-footer-links { display: flex; gap: 30px; justify-content: center; margin-bottom: 30px; flex-wrap: wrap; }
        .ig-footer-links a { font-family: var(--font-display); font-size: 12.5px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
        .ig-footer-links a.active, .ig-footer-links a:hover { color: var(--red); }
        .ig-footer-bottom {
          border-top: 1px solid var(--line); padding-top: 20px; display: flex; justify-content: space-between;
          color: var(--muted-2); font-size: 12px; flex-wrap: wrap; gap: 10px;
        }

        /* ---------- responsive ---------- */
        @media (max-width: 980px) {
          .ig-reasons-grid { grid-template-columns: 1fr; }
          .ig-exp-grid { grid-template-columns: 1fr; gap: 40px 0; }
          .ig-exp-photo { order: -1; }
          .ig-trainer-row { grid-template-columns: 1fr 1fr; }
          .ig-final-box { grid-template-columns: 1fr; padding: 30px; }
          .ig-hero-outline { display: none; }
          .ig-hero { min-height: 480px; }
        }
        @media (max-width: 680px) {
          .ig-container { padding: 0 16px; }
          .ig-links { display: none; }
          .ig-menu-toggle { display: block; }
          .ig-nav .ig-btn-solid { display: none; }
          .ig-hero { min-height: 400px; }
          .ig-hero-inner h1 { font-size: clamp(28px, 8vw, 42px); }
          .ig-hero-stats { flex-wrap: wrap; row-gap: 16px; }
          .ig-hero-stat { padding: 0 16px; }
          .ig-hero-stat:first-child { padding-left: 0; }
          .ig-section { padding: 56px 0; }
          .ig-section-head { margin-bottom: 32px; }
          .ig-trainer-row { grid-template-columns: 1fr; }
          .ig-exp-grid { gap: 24px 0; }
          .ig-exp-photo img { height: 280px; }
          .ig-final { padding: 56px 0; }
          .ig-final-box { padding: 20px; }
          .ig-final-photo img { height: 280px; }
          .ig-form-row { flex-direction: column; }
          .ig-footer { padding: 32px 0 18px; }
          .ig-footer-bottom { flex-direction: column; text-align: center; }
        }
      `}</style>

      {/* ---------------- NAV ---------------- */}
      <header className={`ig-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="ig-container ig-nav-inner">
          <div className="ig-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/images/icon/icon_mr_rp.png" alt="MR Training" style={{ height: 100, width: 'auto' }} />
          </div>
          <nav className="ig-links">
            {NAV_LINKS.map((l, i) => (
              <a key={l} href={l === "Coaching" ? "/coach/login" : `#${l.toLowerCase().replace(/\s/g, "-")}`} className={i === 0 ? "active" : ""}>
                {l}
              </a>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="#contact-us" className="ig-btn ig-btn-solid">Started Now</a>
            <button
              className="ig-menu-toggle"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </header>

      {/* Spacer for fixed nav */}
      <div style={{ height: 120 }} />

      {menuOpen && (
        <div className="ig-mobile-menu">
          {NAV_LINKS.map((l) => (
              <a key={l} href={l === "Coaching" ? "/coach/login" : `#${l.toLowerCase().replace(/\s/g, "-")}`} onClick={() => setMenuOpen(false)}>{l}</a>
          ))}
        </div>
      )}

      {/* ---------------- HERO ---------------- */}
      <section className="ig-hero" id="home">
        <div className="ig-hero-photo">
          <img src={img("irongym-hero", 1400, 900)} alt="Athlete doing a seated dumbbell curl in the gym" />
        </div>
        <div className="ig-hero-outline" aria-hidden="true">
          <img src="/images/icon/icon_mr_rp_wapp.png" alt="" />
        </div>
        <div className="ig-container ig-hero-inner">
          <h1>
            Ready to Train
            <span className="accent">Your Body</span>
          </h1>
          <p className="ig-hero-copy">
            Gym training is a structured, disciplined approach to physical
            exercise that focuses on strength, endurance, and overall
            fitness improvement.
          </p>
          <a href="#contact-us" className="ig-btn">Let&apos;s Join Now</a>
          <div className="ig-hero-stats">
            {STATS.map((s) => (
              <div className="ig-hero-stat" key={s.label}>
                <div className="ig-hero-stat-val">{s.value}</div>
                <div className="ig-hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- WHY CHOOSE US ---------------- */}
      <section className="ig-section ig-why" id="service">
        <div className="ig-container">
          <div className="ig-section-head">
            <h2 className="ig-h2">Why <span className="accent">Choose Us</span></h2>
            <p className="ig-lede">
              Gym training offers a versatile, customizable experience,
              letting everyone set and hit their own fitness goals.
            </p>
          </div>
          <div className="ig-reasons-grid">
            {REASONS.map((r) => (
              <div className="ig-reason" key={r.n}>
                <div className="ig-reason-n">{r.n}</div>
                <h3 className="ig-reason-title">{r.title}</h3>
                <p className="ig-reason-copy">{r.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- EXPERIENCE ---------------- */}
      <section className="ig-section">
        <div className="ig-container ig-exp-grid">
          <div className="ig-exp-text">
            <h2 className="ig-h2">We Have a Lot of<span className="accent" style={{ display: "block" }}>Experience</span></h2>
            <p>
              Our coaching staff has spent two decades on the floor,
              building programs for beginners and competitive lifters
              alike. We track every session, every plate, every rep.
            </p>
            <p>
              Whether you&apos;re chasing your first pull-up or your next
              competition total, the plan adjusts to where you actually
              are, not where a template assumes you are.
            </p>
            <a href="#service" className="ig-btn">About Us</a>
          </div>
          <div className="ig-exp-photo">
            <img src={img("irongym-experience", 700, 700)} alt="Athlete performing a pull-up on a rig" />
          </div>
        </div>
      </section>

      {/* ---------------- TRAINERS ---------------- */}
      <section className="ig-section ig-why" id="trainers">
        <div className="ig-container">
          <div className="ig-section-head">
            <h2 className="ig-h2">Our Professional<span className="accent" style={{ display: "block" }}>Trainers</span></h2>
            <p className="ig-lede">
              Whether you&apos;re looking to set up a home gym or enhance your
              current workout routine, our team has run the program.
            </p>
          </div>
          <div className="ig-trainer-row">
            {visibleTrainers.map((t) => (
              <div className="ig-trainer-card" key={t.name}>
                <img src={img(t.seed, 400, 460)} alt={t.name} />
                <div className="ig-trainer-body">
                  <h3 className="ig-trainer-name">{t.name}</h3>
                  <div className="ig-trainer-rate">Rate Trainer:</div>
                  <div className="ig-trainer-stars"><Stars /></div>
                </div>
              </div>
            ))}
          </div>
          <div className="ig-dots">
            {TRAINERS.map((_, i) => (
              <button
                key={i}
                className={i === trainerStart ? "active" : ""}
                onClick={() => setTrainerStart(i)}
                aria-label={`Show trainer set ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- TESTIMONIALS ---------------- */}
      <section className="ig-section ig-testi" id="testimonial">
        <div className="ig-container">
          <h2 className="ig-h2">What <span className="accent">Clients Say</span> With Us</h2>
          <p className="ig-testi-quote">&ldquo;{testimonial.quote}&rdquo;</p>
          <div style={{ display: "flex", justifyContent: "center" }}><Stars /></div>
          <div className="ig-testi-name">{testimonial.name}</div>
          <img className="ig-testi-avatar" src={`https://i.pravatar.cc/120?img=${testiIndex + 20}`} alt={testimonial.name} />
          <div className="ig-testi-nav">
            <button
              onClick={() => setTestiIndex((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
              aria-label="Previous testimonial"
            >
              <Icon name="arrow-left" />
            </button>
            <button
              onClick={() => setTestiIndex((i) => (i + 1) % TESTIMONIALS.length)}
              aria-label="Next testimonial"
            >
              <Icon name="arrow-right" />
            </button>
          </div>
          <div className="ig-dots">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                className={i === testiIndex ? "active" : ""}
                onClick={() => setTestiIndex(i)}
                aria-label={`Show testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section className="ig-final" id="contact-us">
        <div className="ig-container">
          <div className="ig-final-box">
            <div className="ig-final-photo">
              <img src={img("irongym-final", 600, 700)} alt="Athlete flexing after a training session" />
            </div>
            <div>
              <h2 className="ig-h2">Let&apos;s Start Gym<span className="accent" style={{ display: "block" }}>Training Now</span></h2>
              <p className="ig-final-copy">
                Get 50% off your first three classes when you sign up for
                any GYM membership this month.
              </p>
              <form className="ig-form" onSubmit={(e) => e.preventDefault()}>
                <div className="ig-form-row">
                  <input type="text" placeholder="Enter Your Name.." />
                  <input type="tel" placeholder="Numbers Phone.." />
                </div>
                <input type="email" placeholder="Your Email Address.." />
                <button type="submit" className="ig-btn" style={{ alignSelf: "flex-start" }}>
                  Let&apos;s Join Now
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="ig-footer">
        <div className="ig-container">
          <div className="ig-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <img src="/images/icon/icon_mr.png" alt="MR Training" style={{ height: 36, width: 'auto' }} />
            <span>MR TRAINING</span>
          </div>
          <nav className="ig-footer-links">
            {NAV_LINKS.map((l, i) => (
              <a key={l} href={l === "Coaching" ? "/coach/login" : `#${l.toLowerCase().replace(/\s/g, "-")}`} className={i === 0 ? "active" : ""}>
                {l}
              </a>
            ))}
          </nav>
          <div className="ig-footer-bottom">
            <span>Privacy &nbsp;|&nbsp; Terms and condition</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved. MR Training</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
