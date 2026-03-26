import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#162032",
        paper: "#fdf8f1",
        brass: "#b08242",
        teal: "#177e89",
        coral: "#d05c44",
      },
    },
  },
  plugins: [],
};

export default config;
