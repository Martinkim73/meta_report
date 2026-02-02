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
        // 토스 컬러 시스템
        primary: "#3182F6",
        secondary: "#1B64DA",
        background: "#F4F5F7",
        foreground: "#191F28",
        muted: "#8B95A1",
        border: "#E5E8EB",
        error: "#F04452",
        success: "#14B17C",
      },
      fontFamily: {
        sans: ["'Noto Sans KR'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
