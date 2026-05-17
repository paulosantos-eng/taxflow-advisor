import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Suno palette — vermelho/branco/preto
        brand: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          500: "#E30613",  // vermelho Suno
          600: "#C5050F",
          700: "#A30410",
          800: "#7F0312",
          900: "#5C0210",
          950: "#3A010A",
        },
        ink: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#E5E5E5",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0A0A0A",
        },
        success: { 500: "#0F7A28", 600: "#0C631F" },
        warn: { 500: "#C24A00", 600: "#A03D00" },
        danger: { 500: "#B91C1C", 600: "#991B1B" },
      },
      fontFamily: {
        sans: ["Inter", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
