import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — Primary
        brand: {
          orange: '#E85D26',
          'orange-light': '#FF7A45',
          magenta: '#C42368',
          'magenta-light': '#E74090',
          gold: '#D4A04A',
        },
        // Dark theme surfaces
        surface: {
          DEFAULT: '#0C0E12',   // body background
          elevated: '#13161C',   // panels
          card: '#1A1E26',       // cards
          border: '#2C323C',     // strokes
        },
        // Text
        ink: {
          primary: '#EAE6DE',
          secondary: '#9E978C',
          muted: '#6B6760',
        },
        // Functional (alerts / status)
        status: {
          success: '#34C759',
          warning: '#FFD60A',
          critical: '#FF453A',
          info: '#5AC8FA',
        },
      },
      fontFamily: {
        display: ['var(--font-archivo-black)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-barlow)', 'system-ui', 'sans-serif'],
        condensed: ['var(--font-barlow-condensed)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Hierarchy from brand guidelines
        'hero': ['3.375rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }], // 54px
        'section': ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.015em' }], // 44px
      },
      borderRadius: {
        'card': '0.75rem',   // 12px, brand standard
        'btn': '0.5rem',     // 8px
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #E85D26 0%, #C42368 100%)',
        'brand-gradient-soft':
          'linear-gradient(135deg, rgba(232,93,38,0.15) 0%, rgba(196,35,104,0.15) 100%)',
      },
      boxShadow: {
        'glow-orange': '0 0 24px -4px rgba(232, 93, 38, 0.35)',
        'glow-critical': '0 0 20px -4px rgba(255, 69, 58, 0.4)',
        'card': '0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      letterSpacing: {
        'label': '0.18em',  // for uppercase labels / badges
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
