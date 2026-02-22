import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#D4AF37",
          dark: "#0d0d0d",
          charcoal: "#1a1a1a",
          surface: "#121212",
          "surface-elevated": "#181818",
        },
      },
      borderRadius: {
        card: "12px",
        "card-lg": "16px",
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(0,0,0,0.4)",
        "card-hover": "0 12px 40px -8px rgba(0,0,0,0.5)",
      },
      transitionDuration: {
        "150": "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
