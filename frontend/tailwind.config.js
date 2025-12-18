/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['DM Sans', 'sans-serif'],
      },
      colors: {
        'midnight': {
          900: '#0a0e1a',
          800: '#111827',
          700: '#1a2234',
          600: '#243049',
        },
        'aurora': {
          green: '#22d3b0',
          blue: '#3b82f6',
          purple: '#8b5cf6',
          pink: '#ec4899',
          orange: '#f97316',
        },
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(34, 211, 176, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(34, 211, 176, 0.4)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

