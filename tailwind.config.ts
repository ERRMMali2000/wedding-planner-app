import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        emerald: { DEFAULT: "#0B4D3C", light: "#146B54" },
        gold: { DEFAULT: "#C9A227", light: "#E6C468" },
        ivory: "#FBF8F1",
        henna: "#6B7A3A",
        marigold: "#E8A33D",
        champagne: "#C9A96E",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: { xl2: "1.1rem" },
    },
  },
  plugins: [],
};
export default config;
