const { fontFamily } = require('tailwindcss/defaultTheme');

// Apex Performance palette — Electric Orange centered on #FF5C00
// primary-container #FF5C00, on-primary #5A1B00, ember #FFB59A
const ORANGE_SCALE = {
  50: '#FFF0E6',
  100: '#FFD8BF',
  200: '#FFB59A',
  300: '#FF8C66',
  400: '#FF7043',
  500: '#FF5C00',
  600: '#E05300',
  700: '#CC4A00',
  800: '#993700',
  900: '#5A1B00',
};

// Keep BRAND_SCALE alias for backwards compat — points to ORANGE_SCALE
const BRAND_SCALE = ORANGE_SCALE;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#FF5C00',
          'primary-hover': '#E05300',
          'primary-pressed': '#CC4A00',
          'primary-light': '#FF8C66',
          ember: '#ffb59a',
          'ember-light': '#FFD8BF',
          secondary: '#FF5C00',
          'secondary-hover': '#E05300',
          'secondary-pressed': '#CC4A00',
        },
        // Apex — all decorative accent scales alias to Electric Orange #FF5C00
        // (red/green/emerald/amber/yellow are kept for error/success/warning semantics.)
        orange: ORANGE_SCALE,
        blue: BRAND_SCALE,
        sky: BRAND_SCALE,
        cyan: BRAND_SCALE,
        indigo: BRAND_SCALE,
        purple: BRAND_SCALE,
        violet: BRAND_SCALE,
        fuchsia: BRAND_SCALE,
        pink: BRAND_SCALE,
        teal: BRAND_SCALE,
        surface: {
          0: 'var(--bg)',
          1: 'var(--bg-elevated)',
          2: 'var(--bg-card)',
          3: 'var(--border)',
          4: 'var(--border)',
          5: 'var(--border)',
          6: '#2a2a2a',
        },
        'text-primary': 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        success: '#00C853',
        error: '#FF3D00',
        warning: '#FFB300',
        coral: { accent: '#FF5252' },
        uiux: {
          primary: '#FF5C00',
          'primary-hover': '#E05300',
          'primary-light': '#FFB59A',
          secondary: '#FF5C00',
          'secondary-light': '#FFF0E6',
          surface: {
            0: '#131313',
            1: '#1c1b1b',
            2: '#201f1f',
            3: '#2a2a2a',
          },
          text: {
            primary: '#e5e2e1',
            secondary: '#ab897d',
            tertiary: '#85736b',
          },
        },
      },
      fontFamily: {
        display: ['Montserrat', ...fontFamily.sans],
        body: ['Inter', ...fontFamily.sans],
        mono: ['JetBrains Mono', ...fontFamily.mono],
      },
      fontSize: {
        display: ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        h1: ['36px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        h2: ['28px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '700' }],
        h3: ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        h4: ['18px', { lineHeight: '1.35', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        body: ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '0.01em' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.02em' }],
        overline: ['11px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.1em' }],
      },
      spacing: {
        'section': '6rem',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'orbit': 'orbit 60s linear infinite',
        'streak': 'streak 20s linear infinite',
        'fire-flicker': 'fire-flicker 3s ease-in-out infinite',
        'marquee': 'marquee 28s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,92,0,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255,92,0,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        streak: {
          '0%': { transform: 'translateX(-100%) translateY(-100%)' },
          '100%': { transform: 'translateX(100%) translateY(100%)' },
        },
        'fire-flicker': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '45%': { opacity: '0.92', transform: 'scale(1.02)' },
          '70%': { opacity: '0.97', transform: 'scale(0.99)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
