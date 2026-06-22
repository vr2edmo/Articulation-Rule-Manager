/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── EDMO Design System v1.0 ──────────────────────────────────────
        // Built on EDMO Purple (#5B2B74) + Academic Gold, the Sora typeface,
        // and warm neutrals. The semantic `edmo.*` aliases below are remapped
        // from the legacy navy palette onto the purple brand so existing
        // usages inherit the new identity automatically.

        // Brand — EDMO Purple (10 stops)
        purple: {
          50: "#F6F1FA",
          100: "#EADDF3",
          200: "#D6BCE6",
          300: "#BC93D4",
          400: "#9C63BC",
          500: "#7E3FA3",
          600: "#6A3290",
          700: "#5B2B74", // EDMO Purple — the anchor
          800: "#44205A",
          900: "#2A1438",
          950: "#1B0C26",
        },
        // Accent — Academic Gold (8 stops)
        gold: {
          50: "#FDF7E9",
          100: "#FAEFCB",
          200: "#F4DD93",
          300: "#EDC95C",
          400: "#E6B53A", // Academic Gold
          500: "#D69E22",
          600: "#B67F1A",
          700: "#8F6115",
          800: "#6B4711",
        },

        // Semantic brand aliases (legacy names → purple identity)
        edmo: {
          navy: "#5B2B74", // brand primary (EDMO Purple)
          "navy-700": "#4A2260",
          "navy-900": "#2A1438", // deep hero / overlays
          blue: "#7E3FA3", // links / ghost actions
          "blue-50": "#F6F1FA", // tint surface
          "blue-100": "#EADDF3",
          accent: "#8B45C9", // bright interactive accent / focus
          gold: "#E6B53A",
          "gold-bg": "#FDF7E9",
          ink: "#221A2A", // warm near-black text
          muted: "#6E6678", // warm muted text
          line: "#E8E3EE", // warm borders / dividers
          bg: "#F7F5FA", // warm app background
        },
        status: {
          draft: "#B7791F",
          "draft-bg": "#FCF3DF",
          published: "#1E7A46",
          "published-bg": "#E7F5EC",
          archived: "#6E6678",
          "archived-bg": "#EFECF3",
          warn: "#B45309",
          "warn-bg": "#FFF4E5",
          danger: "#C0392B",
        },
      },
      fontFamily: {
        sans: ["Sora", "system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        // Purple-tinted elevations (rgba anchored on #2A1438)
        card: "0 1px 2px rgba(42,20,56,0.06), 0 1px 3px rgba(42,20,56,0.10)",
        "card-lg": "0 4px 12px rgba(42,20,56,0.10), 0 2px 4px rgba(42,20,56,0.06)",
        panel: "-8px 0 24px rgba(42,20,56,0.16)",
        hero: "0 24px 60px rgba(42,20,56,0.40)",
      },
      backgroundImage: {
        // Deep-purple hero gradient from the design system specimen cards
        "edmo-hero": "linear-gradient(135deg, #2A1438 0%, #44205A 55%, #5B2B74 100%)",
      },
    },
  },
  plugins: [],
};
