module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    ripple: theme => ({
      colors: theme('colors')
    }),
  },
  plugins: [
    require('tailwindcss-ripple')()
  ],
}
