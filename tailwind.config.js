/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // EDMO brand palette — anchored on the navy used in the PRD header (#1B3A6B)
        edmo: {
          navy: "#1B3A6B",
          "navy-700": "#16305a",
          "navy-900": "#0f2342",
          blue: "#2E6FB7",
          "blue-50": "#eef4fb",
          "blue-100": "#d8e6f5",
          accent: "#3A8DDE",
          ink: "#1a2433",
          muted: "#5b6573",
          line: "#e3e8ef",
          bg: "#f5f7fa",
        },
        status: {
          draft: "#B7791F",
          "draft-bg": "#FEF6E7",
          published: "#1E7A46",
          "published-bg": "#E7F5EC",
          archived: "#64748b",
          "archived-bg": "#eef1f5",
          warn: "#B45309",
          "warn-bg": "#FFF4E5",
          danger: "#C0392B",
        },
      },
      fontFamily: {
        sans: ["Arial", "Helvetica Neue", "Helvetica", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,35,66,0.06), 0 1px 3px rgba(16,35,66,0.10)",
        panel: "-8px 0 24px rgba(15,35,66,0.12)",
      },
    },
  },
  plugins: [],
};
