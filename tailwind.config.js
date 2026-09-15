/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./app/**/*.{vue,js,ts}', './components/**/*.{vue,js,ts}', './pages/**/*.vue'],
  theme: {
    extend: {
      colors: {
        ink: '#171717', paper: '#f7f5f0', accent: '#b85c38', 'accent-soft': '#f2ded5',
        primary: { DEFAULT: '#171717', foreground: '#ffffff' },
        background: '#ffffff', foreground: '#171717', border: '#e7e5e4', input: '#d6d3d1', ring: '#b85c38',
        muted: { DEFAULT: '#f5f5f4', foreground: '#57534e' },
        secondary: { DEFAULT: '#f5f5f4', foreground: '#171717' }
      },
      boxShadow: { card: '0 16px 45px rgba(37, 28, 22, 0.08)' }
    }
  },
  plugins: []
}
