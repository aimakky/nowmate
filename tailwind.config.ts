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
        // villia — Forest Sage primary
        brand: {
          50:  '#f0f7f3',
          100: '#d9ece1',
          200: '#b3d9c4',
          300: '#80bf9e',
          400: '#5a9e78',
          500: '#4A7C59',
          600: '#3a6146',
          700: '#2d4d37',
          800: '#1f3526',
          900: '#122016',
        },
        // villia — Terracotta accent
        accent: {
          50:  '#fdf4ef',
          100: '#fae4d3',
          200: '#f5c7a4',
          300: '#eda478',
          400: '#e08554',
          500: '#C4713A',
          600: '#a85d2e',
          700: '#894b25',
        },
        // villia — Birch White background
        birch: '#F5F0E8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
export default config
