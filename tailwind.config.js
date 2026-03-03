/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        opal:    { DEFAULT: '#B6CDC8', light: '#d4e4e0', dark: '#8fb3ac' },
        forest:  { DEFAULT: '#355147', light: '#4a7062', dark: '#253b33' },
        leather: { DEFAULT: '#9F6C5B', light: '#b88472', dark: '#7d5244' },
        hemp:    { DEFAULT: '#907474', light: '#a88f8f', dark: '#6e5757' },
        misty:   { DEFAULT: '#5B8E9F', light: '#7aaabb', dark: '#3d6e7d' },
        orchid:  { DEFAULT: '#8E5B9F', light: '#a878ba', dark: '#6b3f7c' },
        scarlet: { DEFAULT: '#F3161E', light: '#f54e54', dark: '#c01018' },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(53,81,71,0.08)',
        'card-hover': '0 6px 24px rgba(53,81,71,0.14)',
        'sidebar': '4px 0 24px rgba(53,81,71,0.12)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
