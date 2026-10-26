import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pastef: {
          green: "#0B6623",
          darkGreen: "#064016",
          lightGreen: "#E8F5E9",
          red: "#C1272D",
          gold: "#D4AF37",
        },
      },
    },
  },
  plugins: [],
};
export default config;
