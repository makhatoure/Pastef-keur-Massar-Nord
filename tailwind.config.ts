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
          green: "#006837",
          darkGreen: "#004d25",
          lightGreen: "#e6f4ea",
          red: "#C1272D",
          darkRed: "#9e1b20",
          lightRed: "#fde8e9",
        },
      },
    },
  },
  plugins: [],
};
export default config;
