'use client';

import React, { useState } from "react";

/* -------------------------------------------------------------------------
   SPYRO — fitness classes landing page (Unsplash images)
   Dark navy background, orange accent, script accent word in the hero,
   diagonal CTA band. Built to match the supplied reference design.
-------------------------------------------------------------------------- */

function img(seed: string, w: number, h: number) {
  const unsplashMap: Record<string, string> = {
    "spyro-hero": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&h=900&fit=crop",
    "spyro-gym": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&h=440&fit=crop",
    "spyro-zumba": "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=440&fit=crop",
    "spyro-yoga": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=440&fit=crop",
    "spyro-martial": "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&h=440&fit=crop",
    "spyro-lifestyle": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&h=500&fit=crop",
    "spyro-class-1": "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=500&h=380&fit=crop",
    "spyro-class-2": "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500&h=380&fit=crop",
    "spyro-class-3": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500&h=380&fit=crop",
    "spyro-inst-1": "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=380&h=460&fit=crop",
    "spyro-inst-2": "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=380&h=460&fit=crop",
    "spyro-inst-3": "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=380&h=460&fit=crop",
    "spyro-inst-4": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=380&h=460&fit=crop",
    "spyro-app-1": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=300&h=640&fit=crop",
    "spyro-app-2": "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=300&h=640&fit=crop",
    "spyro-video": "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=1600&h=800&fit=crop",
  };
  if (unsplashMap[seed]) return unsplashMap[seed];
  return `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=${w}&h=${h}&fit=crop`;
}

const NAV_LINKS = ["Classes", "Team", "About Us", "Gallery"];

const MOVES = [
  {
    key: "gym",
    label: "GYM",
    wide: true,
    copy: "Expect a heart-pumping workout that will leave you feeling energized and accomplished. Our supportive community of like-minded athletes has your back.",
    seed: "spyro-gym",
  },
  { key: "zumba", label: "Zumba", seed: "spyro-zumba" },
  { key: "yoga", label: "Yoga", seed: "spyro-yoga" },
  { key: "martial", label: "Martial Arts", seed: "spyro-martial" },
];

const CLASSES = [
  {
    tag: "Yoga",
    students: "29 Students",
    title: "Strength & Sweat",
    instructor: "Esther Howard",
    count: "30",
    difficulty: "Beginner",
    duration: "2 H",
    seed: "spyro-class-1",
  },
  {
    tag: "Fitness",
    students: "34 Students",
    title: "Total Body Burnout",
    instructor: "Wade Warren",
    count: "45",
    difficulty: "Medium",
    duration: "4 H",
    seed: "spyro-class-2",
  },
  {
    tag: "Fitness",
    students: "60 Students",
    title: "Bootcamp Challenge",
    instructor: "Robert Fox",
    count: "52",
    difficulty: "Hard",
    duration: "3 H",
    seed: "spyro-class-3",
  },
];

const INSTRUCTORS = [
  { name: "Jacob Jones", role: "Gym Trainer", seed: "spyro-inst-1" },
  { name: "Leslie Alexander", role: "Gym Trainer", seed: "spyro-inst-2" },
  { name: "Cameron Williamson", role: "Gym Trainer", seed: "spyro-inst-3" },
  { name: "Jane Cooper", role: "Gym Trainer", seed: "spyro-inst-4" },
];

const TESTIMONIALS = [
  {
    quote: "I've tried a lot of gyms, but the coaching here is what made the difference. Six months in, my numbers keep climbing.",
    name: "Courtney Henry",
    seed: "1",
  },
  {
    quote: "The class schedule fits around my work week for once. I never have to skip a session because the timing didn't work.",
    name: "Brooklyn Simmons",
    seed: "2",
  },
  {
    quote: "Best decision I made this year. The instructors actually remember your name and your goals, every single class.",
    name: "Jane Cooper",
    seed: "3",
  },
];

const FAQS = [
  {
    q: "What classes does SPYRO offer?",
    a: "SPYRO runs gym floor sessions, Zumba, yoga, and martial arts classes, sorted by time, style, and skill level so you can find something for every mood.",
  },
  {
    q: "Do I need experience to join a class?",
    a: "No. Every class lists a difficulty level, and instructors adjust pace for beginners in every session, not just intro classes.",
  },
  {
    q: "Can I try a class before I commit?",
    a: "Yes — every new member gets a free trial class in any category before choosing a membership plan.",
  },
  {
    q: "How do I book a class?",
    a: "Book through the SPYRO app or at the front desk. Classes open for booking seven days in advance.",
  },
];

function Icon({ name, ...rest }: { name: string } & React.SVGProps<SVGSVGElement>) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
  switch (name) {
    case "plus":
      return (
        <svg {...common} width="16" height="16">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "minus":
      return (
        <svg {...common} width="16" height="16">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common} width="14" height="14">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.2 2" />
        </svg>
      );
    case "star":
      return (
        <svg {...common} width="14" height="14" fill="currentColor" stroke="none">
          <polygon points="12,2 15,9 22,9.5 16.8,14.2 18.5,21 12,17.2 5.5,21 7.2,14.2 2,9.5 9,9" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} width="22" height="22" fill="currentColor" stroke="none">
          <polygon points="6,4 20,12 6,20" />
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
    case "facebook":
      return (
        <svg {...common} width="16" height="16" fill="currentColor" stroke="none">
          <path d="M13.5 21v-7.5h2.5l.4-3H13.5V8.4c0-.9.2-1.5 1.5-1.5h1.6V4.3C16.3 4.2 15.2 4 14 4c-2.4 0-4 1.5-4 4.1v2.4H7.5v3H10V21h3.5Z" />
        </svg>
      );
    case "twitter":
      return (
        <svg {...common} width="16" height="16" fill="currentColor" stroke="none">
          <path d="M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1a4.1 4.1 0 0 0 3.3 4 4.2 4.2 0 0 1-1.9.1 4.1 4.1 0 0 0 3.8 2.9A8.3 8.3 0 0 1 2 18.4a11.6 11.6 0 0 0 6.3 1.9c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.2Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common} width="16" height="16">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} width="16" height="16" fill="currentColor" stroke="none">
          <path d="M14.5 3h2.6c.2 1.7 1.4 3.2 3.4 3.5v2.7c-1.3 0-2.5-.4-3.4-1.1v6.4a5.4 5.4 0 1 1-5.4-5.4c.2 0 .4 0 .6.03v2.7a2.7 2.7 0 1 0 2.2 2.66V3Z" />
        </svg>
      );
    case "apple":
      return (
        <svg {...common} width="16" height="16" fill="currentColor" stroke="none">
          <path d="M16.4 12.6c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1.1 2.7-2.2.9-1.2 1.2-2.4 1.2-2.5-.1 0-2.4-.9-2.5-3.6ZM14 5.8c.6-.7 1-1.7.9-2.8-.9.1-2 .6-2.6 1.4-.6.6-1.1 1.7-.9 2.7 1 .1 2-.5 2.6-1.3Z" />
        </svg>
      );
    case "play-store":
      return (
        <svg {...common} width="16" height="16" fill="currentColor" stroke="none">
          <path d="M4 3.5c-.3.3-.5.7-.5 1.2v14.6c0 .5.2.9.5 1.2l9-8.5-9-8.5Z" />
          <path d="M15 12l2.6-1.5-3-1.7L12 11l2.6 2.2 3-1.7L15 12Z" opacity="0.85" />
        </svg>
      );
    default:
      return null;
  }
}

function Accordion({ item, open, onToggle }: { item: { q: string; a: string }; open: boolean; onToggle: () => void }) {
  return (
    <div className="sp-faq-item">
      <button className="sp-faq-q" onClick={onToggle} aria-expanded={open}>
        <span>{item.q}</span>
        <Icon name={open ? "minus" : "plus"} />
      </button>
      {open && (
        <div className="sp-faq-a">
          <p>{item.a}</p>
        </div>
      )}
    </div>
  );
}

export default function Page2() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);

  return (
    <div className="sp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600&family=Caveat:wght@600;700&display=swap');

        .sp-root {
          --bg: #0b0d12;
          --bg-elevated: #12151c;
          --bg-card: #171b23;
          --line: #262b35;
          --white: #ffffff;
          --muted: #9aa0ac;
          --muted-2: #6b7280;
          --orange: #f2611d;
          --orange-dark: #cf4c12;

          --font-display: 'Poppins', sans-serif;
          --font-script: 'Caveat', cursive;
          --font-body: 'Inter', -apple-system, sans-serif;

          background: var(--bg);
          color: var(--white);
          font-family: var(--font-body);
          line-height: 1.55;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }
        .sp-root * { box-sizing: border-box; }
        .sp-root a { color: inherit; text-decoration: none; }
        .sp-root img { display: block; max-width: 100%; }
        .sp-root :focus-visible { outline: 2px solid var(--orange); outline-offset: 3px; }

        .sp-container { max-width: 1200px; margin: 0 auto; padding: 0 32px; }

        .sp-h2 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(26px, 3.4vw, 36px);
          margin: 0 0 14px;
        }
        .sp-lede { color: var(--muted); font-size: 15px; margin: 0; }
        .sp-center { text-align: center; margin: 0 auto; }

        .sp-btn {
          font-family: var(--font-body);
          font-size: 13.5px;
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 8px;
          border: 1.5px solid transparent;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: opacity 0.15s ease, background 0.15s ease, border-color .15s ease;
          white-space: nowrap;
        }
        .sp-btn-orange { background: var(--orange); color: var(--white); }
        .sp-btn-orange:hover { background: var(--orange-dark); }
        .sp-btn-outline { background: transparent; border-color: rgba(255,255,255,0.3); color: var(--white); }
        .sp-btn-outline:hover { border-color: var(--white); }
        .sp-btn-white { background: var(--white); color: var(--bg); }

        /* ---------- nav ---------- */
        .sp-nav { position: sticky; top: 0; z-index: 50; background: rgba(11,13,18,0.85); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
        .sp-nav-inner { display: flex; align-items: center; justify-content: space-between; height: 78px; }
        .sp-logo { font-family: var(--font-display); font-weight: 800; font-size: 20px; color: var(--orange); letter-spacing: 0.03em; }
        .sp-links { display: flex; gap: 32px; }
        .sp-links a { color: rgba(255,255,255,0.8); font-size: 14.5px; font-weight: 500; transition: color .15s; }
        .sp-links a:hover { color: var(--white); }
        .sp-menu-toggle { display: none; background: none; border: none; color: var(--white); cursor: pointer; }
        .sp-mobile-menu {
          position: fixed; inset: 0; top: 78px; background: var(--bg); z-index: 49;
          padding: 30px 32px; display: flex; flex-direction: column; gap: 22px;
        }
        .sp-mobile-menu a { color: var(--white); font-size: 24px; font-weight: 600; font-family: var(--font-display); }

        /* ---------- hero ---------- */
        .sp-hero { position: relative; overflow: hidden; }
        .sp-hero-bg {
          position: absolute; inset: 0;
          background: radial-gradient(60% 80% at 78% 30%, rgba(242,97,29,0.14), transparent 70%);
        }
        .sp-hero-grid { display: grid; grid-template-columns: 1fr 1fr; align-items: center; min-height: 640px; }
        .sp-hero-text { position: relative; z-index: 2; padding: 60px 0; }
        .sp-hero-text h1 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(34px, 4.6vw, 50px);
          line-height: 1.12;
          margin: 0 0 22px;
        }
        .sp-hero-text h1 .script {
          font-family: var(--font-script);
          font-weight: 700;
          color: var(--orange);
          font-size: 1.28em;
          margin-right: 10px;
        }
        .sp-hero-copy { color: var(--muted); font-size: 15px; max-width: 42ch; margin: 0 0 28px; }
        .sp-hero-photo {
          position: relative; z-index: 1; height: 100%; min-height: 560px;
          background-size: cover; background-position: center;
        }
        .sp-hero-photo::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, var(--bg) 0%, transparent 22%);
        }

        /* ---------- section base ---------- */
        .sp-section { padding: 96px 0; }

        /* ---------- find what moves you ---------- */
        .sp-moves-grid { display: grid; grid-template-columns: 1.9fr 1fr 1fr 1fr; gap: 20px; margin-top: 46px; }
        .sp-move-wide { display: flex; gap: 18px; align-items: flex-start; }
        .sp-move-wide img { width: 58%; height: 220px; object-fit: cover; border-radius: 14px; }
        .sp-move-wide-text { padding-top: 10px; }
        .sp-move-wide-text .lbl { font-family: var(--font-display); font-weight: 700; font-size: 20px; margin-bottom: 10px; }
        .sp-move-wide-text p { color: var(--muted); font-size: 13.5px; margin: 0; }
        .sp-move-card { position: relative; border-radius: 14px; overflow: hidden; height: 220px; }
        .sp-move-card img { width: 100%; height: 100%; object-fit: cover; }
        .sp-move-tag {
          position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%);
          background: rgba(11,13,18,0.75); backdrop-filter: blur(4px);
          padding: 7px 18px; border-radius: 999px; font-size: 13px; font-weight: 600;
          white-space: nowrap;
        }

        /* ---------- fit for your lifestyle ---------- */
        .sp-lifestyle { text-align: center; }
        .sp-lifestyle p.sp-lede { max-width: 60ch; margin: 0 auto 46px; }
        .sp-lifestyle-photo { position: relative; max-width: 620px; margin: 0 auto; }
        .sp-lifestyle-photo .accent {
          position: absolute; right: -18px; bottom: -18px; width: 60%; height: 40%;
          background: var(--orange); border-radius: 12px; z-index: 0;
        }
        .sp-lifestyle-photo img {
          position: relative; z-index: 1; width: 100%; height: 340px; object-fit: cover;
          border-radius: 14px; border: 6px solid var(--orange);
        }

        /* ---------- classes ---------- */
        .sp-classes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin-top: 46px; }
        .sp-class-card { background: var(--bg-card); border-radius: 16px; overflow: hidden; border: 1px solid var(--line); }
        .sp-class-photo { position: relative; height: 190px; }
        .sp-class-photo img { width: 100%; height: 100%; object-fit: cover; }
        .sp-class-tag {
          position: absolute; top: 14px; left: 14px; background: rgba(11,13,18,0.8);
          padding: 5px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 600;
        }
        .sp-class-students {
          position: absolute; top: 14px; right: 14px; background: rgba(11,13,18,0.8);
          padding: 5px 12px; border-radius: 999px; font-size: 11.5px; display: flex; align-items: center; gap: 5px;
        }
        .sp-class-body { padding: 22px 22px 26px; }
        .sp-class-title { font-family: var(--font-display); font-weight: 700; font-size: 18px; margin: 0 0 4px; }
        .sp-class-instructor { color: var(--muted); font-size: 13px; margin: 0 0 14px; }
        .sp-class-meta { list-style: none; padding: 0; margin: 0 0 20px; display: flex; flex-direction: column; gap: 7px; }
        .sp-class-meta li { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 8px; }
        .sp-class-meta li::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--orange); flex-shrink: 0; }
        .sp-class-actions { display: flex; gap: 10px; }
        .sp-class-actions .sp-btn { flex: 1; justify-content: center; padding: 11px 14px; font-size: 12.5px; }
        .sp-see-all { text-align: center; margin-top: 46px; }

        /* ---------- instructors ---------- */
        .sp-inst-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; margin-top: 46px; }
        .sp-inst-card img { width: 100%; height: 250px; object-fit: cover; border-radius: 14px; margin-bottom: 14px; border: 1px solid var(--line); }
        .sp-inst-name { font-family: var(--font-display); font-weight: 600; font-size: 16px; margin: 0 0 2px; }
        .sp-inst-role { color: var(--muted); font-size: 13px; }

        /* ---------- app CTA ---------- */
        .sp-app-cta { background: var(--orange); padding: 76px 0; overflow: hidden; }
        .sp-app-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; align-items: center; gap: 40px; }
        .sp-app-grid h2 { font-family: var(--font-display); font-weight: 700; font-size: clamp(26px, 3.6vw, 36px); margin: 0 0 14px; }
        .sp-app-grid p { color: rgba(255,255,255,0.85); margin: 0 0 26px; max-width: 42ch; }
        .sp-store-row { display: flex; gap: 14px; }
        .sp-store-btn {
          display: flex; align-items: center; gap: 10px; background: #0b0d12; color: var(--white);
          padding: 10px 18px; border-radius: 10px; font-size: 11px; line-height: 1.2;
        }
        .sp-store-btn strong { display: block; font-size: 14px; font-family: var(--font-display); }
        .sp-phones { display: flex; justify-content: center; gap: -20px; position: relative; height: 340px; }
        .sp-phone {
          width: 150px; height: 320px; border-radius: 22px; border: 6px solid #0b0d12; overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3); position: absolute;
        }
        .sp-phone img { width: 100%; height: 100%; object-fit: cover; }
        .sp-phone.p1 { left: 30%; top: 30px; z-index: 2; }
        .sp-phone.p2 { left: 55%; top: 0; z-index: 1; }

        /* ---------- video band ---------- */
        .sp-video-band { position: relative; height: 420px; }
        .sp-video-band img { width: 100%; height: 100%; object-fit: cover; }
        .sp-video-overlay { position: absolute; inset: 0; background: rgba(11,13,18,0.35); display: flex; align-items: center; justify-content: center; }
        .sp-play-btn {
          width: 78px; height: 78px; border-radius: 50%; background: var(--white); color: var(--bg);
          display: flex; align-items: center; justify-content: center; border: none; cursor: pointer;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }

        /* ---------- testimonials ---------- */
        .sp-testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 46px; }
        .sp-testi-card { background: var(--bg-card); border: 1px solid var(--line); border-radius: 16px; padding: 26px; }
        .sp-testi-quote { font-size: 14px; color: rgba(255,255,255,0.85); margin: 0 0 20px; }
        .sp-testi-stars { display: flex; gap: 3px; color: var(--orange); margin-bottom: 16px; }
        .sp-testi-person { display: flex; align-items: center; gap: 12px; padding-top: 14px; border-top: 2px solid var(--orange); }
        .sp-testi-person img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; }
        .sp-testi-name { font-size: 13.5px; font-weight: 600; }

        /* ---------- faq ---------- */
        .sp-faq-list { max-width: 800px; margin: 46px auto 0; }
        .sp-faq-item { border-bottom: 1px solid var(--line); }
        .sp-faq-q {
          width: 100%; background: none; border: none; color: var(--white); cursor: pointer;
          display: flex; align-items: center; justify-content: space-between; padding: 22px 4px;
          font-family: var(--font-body); font-size: 15px; font-weight: 500; text-align: left;
        }
        .sp-faq-q svg { color: var(--orange); flex-shrink: 0; }
        .sp-faq-a {
          background: linear-gradient(120deg, rgba(242,97,29,0.16), rgba(242,97,29,0.05));
          border-radius: 4px 16px 4px 16px;
          padding: 18px 22px; margin: 0 4px 22px;
        }
        .sp-faq-a p { color: rgba(255,255,255,0.75); font-size: 14px; margin: 0; }

        /* ---------- final cta ---------- */
        .sp-final-cta { padding: 90px 0; position: relative; }
        .sp-final-band {
          background: var(--orange);
          padding: 46px 56px;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;
          clip-path: polygon(0 0, 100% 0, 97% 100%, 0% 100%);
        }
        .sp-final-band h2 { font-family: var(--font-display); font-weight: 700; font-size: clamp(22px, 2.8vw, 30px); margin: 0 0 8px; }
        .sp-final-band p { margin: 0; color: rgba(255,255,255,0.85); font-size: 14px; max-width: 46ch; }

        /* ---------- footer ---------- */
        .sp-footer { padding: 60px 0 30px; border-top: 1px solid var(--line); text-align: center; }
        .sp-footer .sp-logo { font-size: 24px; margin-bottom: 16px; display: inline-block; }
        .sp-footer p { color: var(--muted); max-width: 56ch; margin: 0 auto 26px; font-size: 14px; }
        .sp-footer-social { display: flex; gap: 14px; justify-content: center; margin-bottom: 28px; }
        .sp-footer-social a {
          width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--line);
          display: flex; align-items: center; justify-content: center; color: var(--muted); transition: color .15s, border-color .15s;
        }
        .sp-footer-social a:hover { color: var(--white); border-color: var(--white); }
        .sp-footer-copy { color: var(--muted-2); font-size: 12.5px; }

        /* ---------- responsive ---------- */
        @media (max-width: 1000px) {
          .sp-hero-grid { grid-template-columns: 1fr; min-height: auto; }
          .sp-hero-photo { min-height: 360px; order: -1; }
          .sp-hero-photo::before { background: linear-gradient(0deg, var(--bg) 0%, transparent 30%); }
          .sp-moves-grid { grid-template-columns: 1fr 1fr; }
          .sp-move-wide { grid-column: 1 / -1; }
          .sp-classes-grid { grid-template-columns: 1fr; }
          .sp-inst-grid { grid-template-columns: 1fr 1fr; }
          .sp-app-grid { grid-template-columns: 1fr; }
          .sp-phones { margin-top: 20px; }
          .sp-testi-grid { grid-template-columns: 1fr; }
          .sp-video-band { height: 280px; }
        }
        @media (max-width: 680px) {
          .sp-container { padding: 0 16px; }
          .sp-links { display: none; }
          .sp-menu-toggle { display: block; }
          .sp-nav .sp-btn-orange { display: none; }
          .sp-moves-grid { grid-template-columns: 1fr; }
          .sp-move-wide { flex-direction: column; }
          .sp-move-wide img { width: 100%; }
          .sp-inst-grid { grid-template-columns: 1fr; }
          .sp-section { padding: 56px 0; }
          .sp-hero-text { padding: 32px 0; }
          .sp-btn { white-space: normal; }
          .sp-phones { position: relative; height: 260px; }
          .sp-phone { width: 120px; height: 240px; }
          .sp-phone.p1 { left: 15%; top: 20px; }
          .sp-phone.p2 { left: 50%; top: 0; }
          .sp-lifestyle-photo img { height: 220px; }
          .sp-video-band { height: 200px; }
          .sp-final-band { flex-direction: column; align-items: flex-start; clip-path: none; padding: 28px 24px; }
          .sp-final-cta { padding: 48px 0; }
          .sp-footer { padding: 36px 0 20px; }
          .sp-faq-q { font-size: 14px; padding: 16px 0; }
        }
      `}</style>

      {/* ---------------- NAV ---------------- */}
      <header className="sp-nav">
        <div className="sp-container sp-nav-inner">
          <div className="sp-logo">SPYRO</div>
          <nav className="sp-links">
            {NAV_LINKS.map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/\s/g, "-")}`}>{l}</a>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="#contact" className="sp-btn sp-btn-orange">Contact Us</a>
            <button
              className="sp-menu-toggle"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="sp-mobile-menu">
          {NAV_LINKS.map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s/g, "-")}`} onClick={() => setMenuOpen(false)}>{l}</a>
          ))}
        </div>
      )}

      {/* ---------------- HERO ---------------- */}
      <section className="sp-hero">
        <div className="sp-hero-bg" aria-hidden="true" />
        <div className="sp-hero-grid">
          <div className="sp-container sp-hero-text">
            <h1>
              <span className="script">Unleash</span>your
              <br />
              Inner Athlete
            </h1>
            <p className="sp-hero-copy">
              Get ready to sweat it out and hit your fitness goals with our
              high-energy classes. Built for every level, made to keep you
              coming back.
            </p>
            <a href="#classes" className="sp-btn sp-btn-orange">Start Free Trial</a>
          </div>
          <div
            className="sp-hero-photo"
            style={{ backgroundImage: `url(${img("spyro-hero", 900, 900)})` }}
            role="img"
            aria-label="Athlete lifting dumbbells during a gym session"
          />
        </div>
      </section>

      {/* ---------------- FIND WHAT MOVES YOU ---------------- */}
      <section className="sp-section" id="classes">
        <div className="sp-container">
          <h2 className="sp-h2 sp-center">Find what moves you</h2>
          <div className="sp-moves-grid">
            <div className="sp-move-wide">
              <img src={img(MOVES[0].seed, 500, 440)} alt="Members training on the gym floor" />
              <div className="sp-move-wide-text">
                <div className="lbl">{MOVES[0].label}</div>
                <p>{MOVES[0].copy}</p>
              </div>
            </div>
            {MOVES.slice(1).map((m) => (
              <div className="sp-move-card" key={m.key}>
                <img src={img(m.seed, 400, 440)} alt={`${m.label} class`} />
                <span className="sp-move-tag">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FIT FOR YOUR LIFESTYLE ---------------- */}
      <section className="sp-section sp-lifestyle">
        <div className="sp-container">
          <h2 className="sp-h2">Fit for your lifestyle</h2>
          <p className="sp-lede">
            Wake up with a sunrise session, sweat it out with lunchtime
            HIIT, or unwind with an evening flow. There&apos;s movement for
            every mood, sorted by time, style, and skill level.
          </p>
          <div className="sp-lifestyle-photo">
            <div className="accent" aria-hidden="true" />
            <img src={img("spyro-lifestyle", 900, 500)} alt="Trainer mid-movement on the gym floor" />
          </div>
        </div>
      </section>

      {/* ---------------- CLASSES ---------------- */}
      <section className="sp-section">
        <div className="sp-container">
          <h2 className="sp-h2 sp-center">Classes</h2>
          <div className="sp-classes-grid">
            {CLASSES.map((c) => (
              <div className="sp-class-card" key={c.title}>
                <div className="sp-class-photo">
                  <img src={img(c.seed, 500, 380)} alt={c.title} />
                  <span className="sp-class-tag">{c.tag}</span>
                  <span className="sp-class-students">
                    <Icon name="clock" />{c.students}
                  </span>
                </div>
                <div className="sp-class-body">
                  <h3 className="sp-class-title">{c.title}</h3>
                  <p className="sp-class-instructor">Instructor: {c.instructor}</p>
                  <ul className="sp-class-meta">
                    <li>No. of Classes: {c.count}</li>
                    <li>Difficulty: {c.difficulty}</li>
                    <li>Duration: {c.duration}</li>
                  </ul>
                  <div className="sp-class-actions">
                    <a href="#" className="sp-btn sp-btn-outline" onClick={(e) => e.preventDefault()}>Learn more</a>
                    <a href="#" className="sp-btn sp-btn-orange" onClick={(e) => e.preventDefault()}>Start a Free Trial</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="sp-see-all">
            <a href="#" className="sp-btn sp-btn-orange" onClick={(e) => e.preventDefault()}>See all</a>
          </div>
        </div>
      </section>

      {/* ---------------- INSTRUCTORS ---------------- */}
      <section className="sp-section" id="team">
        <div className="sp-container">
          <h2 className="sp-h2 sp-center">Instructors</h2>
          <div className="sp-inst-grid">
            {INSTRUCTORS.map((p) => (
              <div className="sp-inst-card" key={p.name}>
                <img src={img(p.seed, 380, 460)} alt={p.name} />
                <div className="sp-inst-name">{p.name}</div>
                <div className="sp-inst-role">{p.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- APP CTA ---------------- */}
      <section className="sp-app-cta">
        <div className="sp-container sp-app-grid">
          <div>
            <h2>Download the most loved fitness app</h2>
            <p>Start your fitness journey with us. Join the cult.</p>
            <div className="sp-store-row">
              <a href="#" className="sp-store-btn" onClick={(e) => e.preventDefault()}>
                <Icon name="play-store" />
                <span>GET IT ON<strong>Google Play</strong></span>
              </a>
              <a href="#" className="sp-store-btn" onClick={(e) => e.preventDefault()}>
                <Icon name="apple" />
                <span>Download on the<strong>App Store</strong></span>
              </a>
            </div>
          </div>
          <div className="sp-phones">
            <div className="sp-phone p2"><img src={img("spyro-app-2", 300, 640)} alt="SPYRO app schedule screen" /></div>
            <div className="sp-phone p1"><img src={img("spyro-app-1", 300, 640)} alt="SPYRO app home screen" /></div>
          </div>
        </div>
      </section>

      {/* ---------------- VIDEO BAND ---------------- */}
      <section className="sp-video-band">
        <img src={img("spyro-video", 1600, 800)} alt="Members training with battle ropes" />
        <div className="sp-video-overlay">
          <button className="sp-play-btn" aria-label="Play video" onClick={(e) => e.preventDefault()}>
            <Icon name="play" />
          </button>
        </div>
      </section>

      {/* ---------------- TESTIMONIALS ---------------- */}
      <section className="sp-section">
        <div className="sp-container">
          <h2 className="sp-h2 sp-center">Client&apos;s Feedback</h2>
          <div className="sp-testi-grid">
            {TESTIMONIALS.map((t) => (
              <div className="sp-testi-card" key={t.name}>
                <p className="sp-testi-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="sp-testi-stars">
                  {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" />)}
                </div>
                <div className="sp-testi-person">
                  <img src={`https://i.pravatar.cc/100?img=${t.seed}`} alt={t.name} />
                  <span className="sp-testi-name">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="sp-section" id="about-us">
        <div className="sp-container">
          <h2 className="sp-h2 sp-center">Frequently Asked Question</h2>
          <div className="sp-faq-list">
            {FAQS.map((f, i) => (
              <Accordion
                key={f.q}
                item={f}
                open={faqOpen === i}
                onToggle={() => setFaqOpen(faqOpen === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section className="sp-final-cta" id="contact">
        <div className="sp-container">
          <div className="sp-final-band">
            <div>
              <h2>Are you ready to change?</h2>
              <p>Challenge your strength, stretch your body, breathe easy. Our team of world-class instructors will get you there.</p>
            </div>
            <a href="#classes" className="sp-btn sp-btn-outline" style={{ borderColor: "rgba(255,255,255,0.6)" }}>
              Start your Free Trial
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="sp-footer" id="gallery">
        <div className="sp-container">
          <div className="sp-logo">SPYRO</div>
          <p>
            Join us today and experience the transformative power of our
            fitness classes. Don&apos;t wait to start your fitness journey —
            take the first step towards a healthier, stronger you.
          </p>
          <div className="sp-footer-social">
            <a href="#" aria-label="Facebook"><Icon name="facebook" /></a>
            <a href="#" aria-label="Twitter"><Icon name="twitter" /></a>
            <a href="#" aria-label="Instagram"><Icon name="instagram" /></a>
            <a href="#" aria-label="TikTok"><Icon name="tiktok" /></a>
          </div>
          <div className="sp-footer-copy">&copy; SPYRO {new Date().getFullYear()}. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
