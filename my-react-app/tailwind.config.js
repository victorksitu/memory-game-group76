/ @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src//*.{js,jsx,ts,tsx}", // Adjust if your React components are in a different folder
  ],
  theme: {
    extend: {
      fontFamily: { // Add the Inter font family
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};