import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lime: {
          200: "#e5cca0",
          300: "#d0aa61",
          400: "#b88d47",
        },
        blue: {
          300: "#9eb4bd",
        },
        amber: {
          100: "#f2e6cc",
          300: "#d0aa61",
        },
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem", "3xl": "1.75rem" },
      boxShadow: {
        panel: "0 18px 48px rgba(0, 0, 0, .12)",
        float: "0 16px 38px rgba(0, 0, 0, .18)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
