import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Глубокий графит с сине-фиолетовым подтоном
        ink: {
          950: "#0B0C14",
          900: "#10121D",
          800: "#161927",
          700: "#1E2233",
          600: "#2A2F45",
        },
        accent: {
          blue: "#5EA2FF",
          violet: "#8B6CFF",
          gold: "#F6C453",
        },
        rarity: {
          common: "#8FA0B8",
          rare: "#5EA2FF",
          epic: "#B06CFF",
          legendary: "#F6C453",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        glow: "0 0 24px rgba(94,162,255,0.25)",
        "glow-gold": "0 0 28px rgba(246,196,83,0.3)",
        card: "0 1px 2px rgba(0,0,0,.4), 0 12px 32px rgba(0,0,0,.35)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s linear infinite",
        floaty: "floaty 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
