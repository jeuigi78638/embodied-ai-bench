import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 暗色科技风
        bg: {
          DEFAULT: "#070B14",
          soft: "#0B1120",
          card: "#0F172A",
          border: "#1E293B",
        },
        accent: {
          DEFAULT: "#22D3EE", // 青色主色
          soft: "#67E8F9",
          dim: "#0891B2",
        },
        neon: {
          green: "#34D399",
          amber: "#FBBF24",
          red: "#F87171",
          purple: "#A78BFA",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(34,211,238,0.18)",
        "glow-sm": "0 0 12px rgba(34,211,238,0.14)",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(34,211,238,0.2)" },
          "50%": { boxShadow: "0 0 22px rgba(34,211,238,0.45)" },
        },
        radarSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        fadeUp: "fadeUp 0.35s ease-out both",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
        radarSpin: "radarSpin 3.2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
