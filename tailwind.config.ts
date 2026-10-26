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
        background: "#07090f",
        card: {
          DEFAULT: "rgba(18, 22, 34, 0.75)",
          border: "rgba(255, 255, 255, 0.08)",
        },
        advisory: {
          indicator: "#00FF7F",
          normal: "#2ECC71",
          notice: "#F1C40F",
          warning: "#E74C3C",
          unknown: "#7F8C8D",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
