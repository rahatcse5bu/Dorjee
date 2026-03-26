import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0284c7",
          dark: "#0369a1",
          light: "#e0f2fe",
        },
      },
    },
  },
  plugins: [],
};

export default config;
