/**
 * Content Forge Tailwind configuration — dark monochrome theme.
 *
 * NOTE: This project uses Tailwind CSS v4 (CSS-first). The functional token
 * definitions live in `src/app/globals.css` via `@theme`. This file mirrors
 * the same palette for editor tooling and is wired in through `@config` in
 * that stylesheet. Keep both files in sync.
 *
 * Semantic tokens:
 *   bg-main / bg-card / bg-nested / border-subtle
 *   text-primary / text-secondary / text-muted (large text only, ~3.5:1)
 *   bg-btn-primary / hover:bg-btn-primary-hover
 *   bg-badge / border-badge-border / text-badge-text
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        main: "#0A0A0A",
        card: "#161616",
        nested: "#1F1F1F",
        subtle: "#404040",
        strong: "#525252",
        primary: "#F0F0F0",
        secondary: "#A1A1A1",
        muted: "#6E6E6E",
        "btn-primary": "#2A2A2A",
        "btn-primary-hover": "#404040",
        badge: "#222222",
        "badge-border": "#404040",
        "badge-text": "#D4D4D4",
      },
    },
  },
  plugins: [],
};
