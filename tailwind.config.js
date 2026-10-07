/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        loop: {
          teal: '#0E7C7B',
          tealDark: '#0A5E5D',
          mint: '#CDEBDD',
          mist: '#F1F5F4',
          ink: '#1E2A28',
        },
      },
    },
  },
  plugins: [],
}
