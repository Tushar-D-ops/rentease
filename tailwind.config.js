/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#4f6ef7',
          600: '#3d5ce8',
          700: '#3048c8',
        },
        accent: {
          green: '#06d6a0',
          purple: '#7c3aed',
          gold: '#f5a623',
          red: '#ff4d6d',
        },
      },
    },
  },
  plugins: [],
};