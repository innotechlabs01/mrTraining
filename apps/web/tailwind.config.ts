const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#FF6B00',
          'primary-hover': '#E85D00',
          'primary-pressed': '#CC5200',
          'primary-light': '#FF8A33',
          secondary: '#0066FF',
          'secondary-hover': '#3385FF',
          'secondary-pressed': '#0044CC',
        },
        surface: {
          0: '#0A0B0D',
          1: '#0F0F0F',
          2: '#141416',
          3: '#1A1A1C',
          4: '#1C1C1C',
          5: '#242426',
          6: '#2A2A2C',
        },
        success: '#00C853',
        error: '#FF3D00',
        warning: '#FFB300',
        teal: { accent: '#00BFA5' },
        violet: { accent: '#7C4DFF' },
        coral: { accent: '#FF5252' },
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
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,107,0,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255,107,0,0.6)' },
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
      },
    },
  },
  plugins: [],
};
