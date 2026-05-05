import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f5",
          100: "#e9ebe6",
          200: "#cfd3ca",
          300: "#a8b09e",
          400: "#7c8674",
          500: "#5b6555",
          600: "#454d42",
          700: "#373d35",
          800: "#2b302a",
          900: "#1f231e",
        },
        moss: {
          50: "#f1f6ee",
          100: "#dbe9d3",
          200: "#bdd5ac",
          300: "#94bb7d",
          400: "#6da056",
          500: "#52853f",
          600: "#3f6a30",
          700: "#345428",
          800: "#2a4220",
          900: "#1f3219",
        },
        clay: {
          50: "#fbf6f0",
          100: "#f3e6d4",
          200: "#e6c9a5",
          300: "#d6a572",
          400: "#c4854b",
          500: "#a86a35",
          600: "#86522a",
          700: "#6a4022",
          800: "#52321b",
          900: "#3c2514",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "ui-serif", "Georgia", "serif"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(31,35,30,0.04), 0 8px 24px rgba(31,35,30,0.06)",
        ring: "0 0 0 1px rgba(31,35,30,0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
