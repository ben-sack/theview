import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        oxblood:  "#25080C",
        crimson:  "#3D1014",
        rust:     "#7A2E1E",
        ember:    "#B05630",
        amber:    "#A86828",
        cream:    "#EAD9BB",
        ivory:    "#F4ECD8",
        espresso: "#140407",
        tan:      "#9E8060",
        smoke:    "#C8B898",
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body:    ["var(--font-inter)", "system-ui", "sans-serif"],
        sketch:  ["var(--font-pinyon)", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
