/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: { 950: '#070a12', 900: '#0b1220', 800: '#121a2b', 700: '#1a2438', 600: '#243049' },
        accent: { DEFAULT: '#6b8cff', soft: '#a8c0ff', dim: '#4a6fe0' },
        ok: '#34d399',
        danger: '#f87171',
        warn: '#fbbf24',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'PingFang SC', 'Noto Sans SC', 'sans-serif'],
      },
      maxWidth: { reading: '42rem' },
    },
  },
  plugins: [],
};
