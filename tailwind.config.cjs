/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{astro,js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      colors: {
        volcan: '#18181b',    // Fondo principal oscuro volcán
        hielo: '#a8e7f9',     // Celeste hielo premium
        naranja: '#ff7e38',   // Naranja alerta
      },
      fontFamily: {
        premium: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
