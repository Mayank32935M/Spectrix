/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: '#0a0e16',
          panel: '#111722',
          container: '#18202e',
          elevated: '#222c3d',
          highlight: '#31353e',
        },
        border: {
          hairpin: '#1c2433',
          default: '#25303d',
          active: '#2d3a4f',
        },
        accent: {
          mint: '#35c6a0',
          'mint-bright': '#20e3b2',
          cyan: '#38bdf8',
          violet: '#8b5cf6',
          amber: '#f59e0b',
          'amber-lead': '#e5a93c',
          crimson: '#f43f5e',
          'crimson-dark': '#e11d48',
        },
        content: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Geist Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
      },
    },
  },
  plugins: [],
};

