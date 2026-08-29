import localFont from "next/font/local";

// ─────────────────────────────────────────────────────────────────────────────
// The two brand faces, self-hosted from the design system's own variable TTFs
// (./fonts/*.ttf, from the 2026 Curbio design-system bundle).
//
// ── SCOPED TO /admin, AND NOT SHARING THE MARKETING SITE'S NAMES ────────────
// These are declared here, applied on the /admin layout, and exported under
// `--ops-font-serif` / `--ops-font-sans` — deliberately NOT `--font-serif` /
// `--font-sans`.
//
// Those two global names already exist: app/layout.tsx binds them to the
// next/font/google cuts of the same two families, and every `.lp-*` rule in
// globals.css plus the whole marketing site renders through them. Redefining
// them here would override the global tokens inside /admin, and swapping the
// root layout to these files would change which bytes sell.curbio.com serves.
// Neither is this pass's business. So admin gets its own two names, the
// marketing site keeps its own, and nothing global is touched.
//
// ── Why local rather than the google cuts the site already loads ────────────
// The bundle ships VARIABLE files — Lora 400–700, Libre Franklin 100–900 plus
// a matching italic. The google wiring pins four static instances, so any
// weight outside that list is synthesised by the browser rather than being
// the designed instance. The redesigned Home leans on weights (600 serif
// headings, 800 eyebrows, extrabold numerals) that are better served exactly.
//
// ── Lora has no italic, on purpose ─────────────────────────────────────────
// The 2026 style guide forbids italic Lora: emphasis inside a serif headline
// switches colour to amber at the same weight, upright. No italic file is
// declared, so `<em>` inside a Lora heading cannot fall back to a synthesised
// oblique — there is nothing to slant. Libre Franklin does get its italic; it
// is the body face and real italic body copy is sanctioned.
// ─────────────────────────────────────────────────────────────────────────────

export const opsSerif = localFont({
  src: [{ path: "./fonts/Lora.ttf", weight: "400 700", style: "normal" }],
  display: "swap",
  variable: "--ops-font-serif",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const opsSans = localFont({
  src: [
    { path: "./fonts/LibreFranklin.ttf", weight: "100 900", style: "normal" },
    { path: "./fonts/LibreFranklin-Italic.ttf", weight: "100 900", style: "italic" },
  ],
  display: "swap",
  variable: "--ops-font-sans",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

/** Both variable classes, for the /admin layout's root element. */
export const opsFontVars = `${opsSerif.variable} ${opsSans.variable}`;
