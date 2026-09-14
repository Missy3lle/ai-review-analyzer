import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#20303B",
        cream: "#F5F5F0",
        clay: "#B4623C",
        sage: "#5E6E5A",
        denim: {
          DEFAULT: "#3E5C74",
          dark: "#2F4759",
        },
        amber: {
          bg: "#F3E8CE",
          text: "#8A6A24",
          border: "#DEC08A",
        },
        mist: {
          bg: "#E7ECF0",
          text: "#55697A",
          border: "#C7D3DC",
        },
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
