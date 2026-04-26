import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette inspired by the mockup
        ink: "#1F2D3D",
        muted: "#6B7A8F",
        surface: "#F3F4F2",
        accent: "#D7E9F1",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        pill: "0 2px 10px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
