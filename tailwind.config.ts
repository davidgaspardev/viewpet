import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/ui/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette inspired by the mockup
        ink: "#1F2D3D",
        muted: "#6B7A8F",
        surface: "#F3F4F2",
        accent: "#D7E9F1",
        // Brand accent (Sage, from the style guide). Used for fills and tints —
        // number badges, the tag chip, info and selected states — never for text
        // or as the only focus signal: on white it is 2.06:1, white on it is too.
        // Put `ink` on top of it (6.79:1).
        sage: "#91BFA4",
      },
      borderRadius: {
        // Cards and panels: a touch under `rounded-xl` (12px). Controls inside
        // them (inputs, pills, drop zones) stay at `rounded-lg` (8px).
        card: "0.625rem",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        pill: "0 2px 10px rgba(0,0,0,0.08)",
      },
      keyframes: {
        "snackbar-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // The hanging tag on the marketing home: a slow swing from its ring.
        sway: {
          "0%, 100%": { transform: "rotate(-2.5deg)" },
          "50%": { transform: "rotate(2.5deg)" },
        },
      },
      animation: {
        "snackbar-in": "snackbar-in 180ms ease-out",
        sway: "sway 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
