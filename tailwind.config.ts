import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Cyberpunk Primary (Purple) ─────────────────────
        brand: {
          50:  'rgba(157,92,255,0.08)',
          100: 'rgba(157,92,255,0.15)',
          200: 'rgba(157,92,255,0.25)',
          300: '#c084fc',
          400: '#a855f7',
          500: '#9D5CFF',
          600: '#8B45F0',
          700: '#7B3FE4',
          800: '#6B35CC',
          900: '#5B2BAA',
        },
        // ── Cyberpunk Accents ──────────────────────────────
        cyber: {
          pink:         '#FF4D90',
          'pink-dim':   'rgba(255,77,144,0.15)',
          cyan:         '#49E1FF',
          'cyan-dim':   'rgba(73,225,255,0.12)',
          green:        '#7CFF82',
          'green-dim':  'rgba(124,255,130,0.12)',
          purple:       '#9D5CFF',
          'purple-dim': 'rgba(157,92,255,0.12)',
          dark:         '#080812',
          darker:       '#050509',
          card:         'rgba(255,255,255,0.04)',
          border:       'rgba(157,92,255,0.2)',
          'border-bright': 'rgba(157,92,255,0.45)',
          text:         '#F0EEFF',
          'text-dim':   'rgba(240,238,255,0.55)',
          'text-muted': 'rgba(240,238,255,0.3)',
        },
        // ── birch → dark base (後方互換) ───────────────────
        birch: '#080812',
        // ── accent (pink) ──────────────────────────────────
        accent: {
          50:  'rgba(255,77,144,0.06)',
          100: 'rgba(255,77,144,0.12)',
          200: 'rgba(255,77,144,0.22)',
          300: '#FF84B0',
          400: '#FF6AA0',
          500: '#FF4D90',
          600: '#E8437F',
          700: '#CC3870',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(157,92,255,0.4), 0 0 60px rgba(157,92,255,0.15)',
        'glow-pink':   '0 0 20px rgba(255,77,144,0.4), 0 0 60px rgba(255,77,144,0.15)',
        'glow-cyan':   '0 0 20px rgba(73,225,255,0.4), 0 0 60px rgba(73,225,255,0.15)',
        'glow-sm':     '0 0 12px rgba(157,92,255,0.35)',
        'card-cyber':  '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'cyber-grid':    "linear-gradient(rgba(157,92,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(157,92,255,0.07) 1px, transparent 1px)",
        'gradient-cyber': 'linear-gradient(135deg, #9D5CFF 0%, #FF4D90 100%)',
        'gradient-cyan':  'linear-gradient(135deg, #49E1FF 0%, #9D5CFF 100%)',
        'gradient-night': 'linear-gradient(180deg, #0d0d1f 0%, #080812 100%)',
      },
      backgroundSize: {
        'grid-20': '20px 20px',
      },
    },
  },
  plugins: [],
}
export default config
