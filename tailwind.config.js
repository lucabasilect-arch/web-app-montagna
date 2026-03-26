import { defineConfig } from "tailwindcss";

export default defineConfig({
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: {
          50: "#f5fbff",
          100: "#e8f6ff",
          200: "#c7e8ff",
          400: "#4ea7ff",
          600: "#1b6fdb",
        },
        pine: {
          500: "#1f3b2e",
          600: "#12261b",
          700: "#09140f",
        },
        amber: {
          400: "#fbbf24",
          600: "#d97706",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "Manrope", "sans-serif"],
        body: ["Manrope", "Space Grotesk", "sans-serif"],
      },
    },
  },
  plugins: [],
});
