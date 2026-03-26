import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: "#121a24",
        fog: "#eef2f7",
        amber: "#c27d3e",
        cyan: "#1f8a9b",
        rose: "#c85f56",
      },
    },
  },
  plugins: [],
};

export default config;
