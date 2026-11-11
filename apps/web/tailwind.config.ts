const { fontFamily } = require('tailwindcss/defaultTheme');

// Designated brand color: #15AAF2 (single source of truth for accents).
const BRAND_SCALE = {
  50: '#E8F7FF',
  100: '#C7ECFF',
  200: '#9FDDFF',
  300: '#7FD8FF',
  400: '#4FC3F7',
  500: '#15AAF2',
  600: '#0E93D4',
  700: '#0A7BB3',
  800: '#086291',
  900: '#064B6E',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#15AAF2',
          'primary-hover': '#0E93D4',
          'primary-pressed': '#0A7BB3',
          'primary-light': '#4FC3F7',
          ember: '#7FD8FF',
          'ember-light': '#B3E5FF',
          secondary: '#15AAF2',
          'secondary-hover': '#0E93D4',
          'secondary-pressed': '#0A7BB3',
        },
        // Single designated brand color. Decorative/brand-ish accent scales are
        // aliased to the #15AAF2 scale so the whole UI stays on-brand.
        // (red/green/emerald/amber/yellow are kept for error/success/warning semantics.)
        orange: BRAND_SCALE,
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
          // Elevation steps map to the design-system surface scale. They must
          // stay DISTINCT: collapsing 3/4/5 onto --border made hover and
          // pressed states render identically to the resting state.
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
          5: 'var(--surface-5)',
          6: 'var(--surface-6)',
          DEFAULT: 'var(--bg)',
          raised: 'var(--bg-elevated)',
          card: 'var(--bg-card)',
        },
        'text-primary': 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-muted': 'var(--text-muted)',
        'text-inverse': 'var(--text-inverse)',
        text: {
          DEFAULT: 'var(--text)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          DEFAULT: 'var(--border)',
        },
        // Single source of truth: these must match --color-success / --color-error
        // / --color-warning in globals.css (design system §1.1). Two competing
        // semantic palettes produced inconsistent status colors.
        success: '#34D399',
        error: '#FF5A5F',
        warning: '#FBBF24',
        semantic: {
          success: 'var(--color-success)',
          'success-soft': 'var(--color-success-soft)',
          warning: 'var(--color-warning)',
          'warning-soft': 'var(--color-warning-soft)',
          error: 'var(--color-error)',
          'error-soft': 'var(--color-error-soft)',
          info: 'var(--color-info)',
          'info-soft': 'var(--color-info-soft)',
        },
        coral: { accent: '#FF5252' },
        uiux: {
          primary: '#15AAF2',
          'primary-hover': '#0E93D4',
          'primary-light': '#4FC3F7',
          secondary: '#0EA5E9',
          'secondary-light': '#F0F9FF',
          surface: {
            0: '#FFFFFF',
            1: '#F8FAFC',
            2: '#F1F5F9',
            3: '#E2E8F0',
          },
          text: {
            primary: '#0F172A',
            secondary: '#475569',
            tertiary: '#94A3B8',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(21,170,242,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(21,170,242,0.6)' },
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
