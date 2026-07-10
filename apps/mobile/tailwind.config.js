/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#0F0B1F',
        surface: '#1A1430',
        elevated: '#271D45',
        primary: '#B66CFF',
        secondary: '#FF6FB7',
        accent: '#FFD18A',
        ink: '#FFF9FF',
        muted: '#BEB5CD',
        border: '#392B5A',
        success: '#73D9A6',
        danger: '#FF7A8A'
      }
    }
  },
  plugins: []
};
