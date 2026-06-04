import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0D254D",
          95: "#1A335E",
          85: "#2E466F",
          30: "#8A98AE",
          15: "#C7CFDB",
          "08": "#E4E8EE",
        },
        amber: {
          DEFAULT: "#CD8629",
          110: "#B5731F",
          120: "#9D6118",
          30: "#F0DAB8",
          10: "#FAF1E3",
        },
        teal: {
          DEFAULT: "#176C67",
          110: "#105752",
          30: "#B1CCC9",
        },
        sage: {
          DEFAULT: "#E2EBE5",
          110: "#C9D6CE",
          50: "#EFF4F1",
        },
        stone: { DEFAULT: "#DFDCDA" },
        cloud: "#F7F7F7",
        ink: "#0D254D",
        "fg-muted": "#4A5A75",
        "fg-subtle": "#8A98AE",
        "border-strong": "#BFBCBA",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        hero: ["clamp(48px, 6.4vw, 88px)", { lineHeight: "1.05", letterSpacing: "-0.015em" }],
        h1: ["clamp(40px, 4.6vw, 64px)", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
        h2: ["clamp(30px, 3.2vw, 44px)", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        h3: ["22px", { lineHeight: "1.2" }],
        h4: ["18px", { lineHeight: "1.3" }],
        body: ["16px", { lineHeight: "1.55" }],
        small: ["14px", { lineHeight: "1.5" }],
        label: ["12px", { lineHeight: "1.3", letterSpacing: "0.14em" }],
        micro: ["11px", { lineHeight: "1.3" }],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "20px",
        pill: "999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(13,37,77,0.06), 0 1px 1px rgba(13,37,77,0.04)",
        md: "0 4px 12px rgba(13,37,77,0.08), 0 1px 2px rgba(13,37,77,0.04)",
        lg: "0 16px 40px -12px rgba(13,37,77,0.18), 0 4px 12px rgba(13,37,77,0.06)",
        amber: "0 8px 24px -8px rgba(205,134,41,0.45)",
      },
      maxWidth: {
        container: "1180px",
      },
      transitionTimingFunction: {
        "calm-out": "cubic-bezier(0.22,0.61,0.36,1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "220ms",
        slow: "420ms",
      },
    },
  },
  plugins: [],
};

export default config;
