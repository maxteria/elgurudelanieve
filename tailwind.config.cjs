/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{astro,js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        volcan: '#18181b', // Fondo principal oscuro volcán
        hielo: '#a8e7f9', // Celeste hielo premium
        naranja: '#ff7e38', // Naranja alerta
        surface: {
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          subtle: 'var(--bg-surface-subtle)',
        },
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-faint': 'var(--text-faint)',
        border: {
          subtle: 'var(--border-subtle)',
          medium: 'var(--border-medium)',
        },
      },
      fontFamily: {
        premium: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
