/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#14213d',
          dark:    '#0d1626',
          light:   '#eef0f5',
        },
      },
    },
  },
  plugins: [],
}

