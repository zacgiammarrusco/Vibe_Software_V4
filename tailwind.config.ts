
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f1218",
        panel: "#171c24",
        panel2: "#1f2631",
        border: "#2a3342",
        text: "#e6e9ef",
        sub: "#a9b1bc",
        accent: "#febb3b"
      }
    }
  },
  plugins: [],
};
export default config;
