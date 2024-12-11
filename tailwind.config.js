/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        highlight: {
          '0%': {
            '-webkit-transform': 'scale(0.9)',
            '-ms-transform': 'scale(0.9)',
            'transform': 'scale(0.9)'
          },
          '25%': {
            '-webkit-transform': 'scale(1)',
            '-ms-transform': 'scale(1)',
            'transform': 'scale(1)'
          },
          '60%': {
            '-webkit-transform': 'scale(0.9)',
            '-ms-transform': 'scale(0.9)',
            'transform': 'scale(0.9)'
          },
          '100%': {
            '-webkit-transform': 'scale(0.9)',
            '-ms-transform': 'scale(0.9)',
            'transform': 'scale(0.9)'
          }
        }
      },
      animation: {
        highlight: 'highlight 2s ease-in-out infinite'
      }
    },
  },
  plugins: [],
};
