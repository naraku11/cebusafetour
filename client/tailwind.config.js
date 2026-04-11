/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],

  // Toggle dark mode by adding/removing the `dark` class on <html>
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        cebu: {
          blue:   '#0ea5e9',
          teal:   '#14b8a6',
          orange: '#f97316',
        },
        // Semantic surface tokens used in dark-mode component classes
        surface: {
          DEFAULT: '#ffffff',
          dark:    '#1e293b',   // slate-800
        },
      },

      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },

      boxShadow: {
        'card-hover': '0 4px 24px -4px rgba(0,0,0,0.10)',
      },

      transitionProperty: {
        'colors-shadow': 'color, background-color, border-color, box-shadow',
      },
    },
  },
  plugins: [],
};
