/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        copy: "#10b981",
        avoid: "#ef4444",
        uncertain: "#eab308",
      },
    },
  },
  plugins: [],
};
