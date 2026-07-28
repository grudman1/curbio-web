import type { Config } from "tailwindcss";

// ─────────────────────────────────────────────────────────────────────────────
// Every value below is a var() onto app/tokens.css. Nothing here is a literal.
//
// That is the point: a rebrand changes primitive values in globals.css :root,
// the semantic layer in tokens.css re-points, and every utility class follows
// without a single component edit.
//
// TWO NAMESPACES, deliberately:
//
//   SEMANTIC   `bg-surface-raised`, `text-muted`, `shadow-card` — role-named,
//              backed by tokens.css. USE THESE for all new work.
//
//   PRIMITIVE  `navy`, `amber`, `stone`, … — appearance-named, retained only
//              so the legacy lp-* era stays buildable and so /design-system
//              can show the palette underneath. Do not reach for these in new
//              components; they are the thing Phase 3 replaces.
//
// Breakpoints are intentionally NOT tokenized — CSS custom properties don't
// work in @media conditions. The 14 existing widths stay in globals.css.
// ─────────────────────────────────────────────────────────────────────────────

const config: Config = {
  // config/** is deliberately absent: those files are DATA, and Tailwind's
  // scanner reads bare token-name strings there ("text-body", "duration-fast")
  // as class names, emitting phantom utilities nothing uses.
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── semantic ──
        brand: {
          DEFAULT: "var(--color-brand)",
          muted: "var(--color-brand-muted)",
          subtle: "var(--color-brand-subtle)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          active: "var(--color-accent-active)",
          subtle: "var(--color-accent-subtle)",
          ring: "var(--color-accent-ring)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          raised: "var(--color-surface-raised)",
          sunken: "var(--color-surface-sunken)",
          inverse: "var(--color-surface-inverse)",
          accent: "var(--color-surface-accent)",
        },
        content: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
          subtle: "var(--color-text-subtle)",
          inverse: "var(--color-text-inverse)",
          accent: "var(--color-text-accent)",
          "on-accent": "var(--color-text-on-accent)",
        },
        edge: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
          accent: "var(--color-border-accent)",
          inverse: "var(--color-border-inverse)",
        },
        state: {
          error: "var(--color-state-error)",
          success: "var(--color-state-success)",
          warning: "var(--color-state-warning)",
          info: "var(--color-state-info)",
        },

        // ── primitives (legacy; see header) ──
        navy: {
          DEFAULT: "var(--navy)",
          95: "var(--navy-95)",
          85: "var(--navy-85)",
          30: "var(--navy-30)",
          15: "var(--navy-15)",
          "08": "var(--navy-08)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          110: "var(--amber-110)",
          120: "var(--amber-120)",
          30: "var(--amber-30)",
          10: "var(--amber-10)",
        },
        teal: { DEFAULT: "var(--teal)", 110: "var(--teal-110)", 30: "var(--teal-30)" },
        sage: { DEFAULT: "var(--sage)", 110: "var(--sage-110)", 50: "var(--sage-50)" },
        stone: { DEFAULT: "var(--stone)" },
        cloud: "var(--cloud-white)",
      },
      // Points at the PRIMITIVES, not the semantic aliases. Tailwind's
      // preflight writes fontFamily into `html`, so using the alias here would
      // change a rule that ships on the live pages. Same computed value either
      // way — but this keeps the emitted CSS byte-identical to what is in
      // production today, which is worth more than naming consistency in a
      // config nothing currently consumes.
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        hero: ["var(--text-hero)", { lineHeight: "var(--leading-tight)", letterSpacing: "var(--tracking-tight)" }],
        h1: ["var(--text-h1)", { lineHeight: "var(--leading-tight)", letterSpacing: "var(--tracking-heading)" }],
        h2: ["var(--text-h2)", { lineHeight: "var(--leading-heading)", letterSpacing: "var(--tracking-heading)" }],
        h3: ["var(--text-h3)", { lineHeight: "var(--leading-heading)" }],
        h4: ["var(--text-h4)", { lineHeight: "var(--leading-heading)" }],
        body: ["var(--text-body)", { lineHeight: "var(--leading-body)" }],
        small: ["var(--text-small)", { lineHeight: "var(--leading-body)" }],
        label: ["var(--text-label)", { lineHeight: "var(--leading-heading)", letterSpacing: "var(--tracking-label)" }],
        micro: ["var(--text-micro)", { lineHeight: "var(--leading-heading)" }],
      },
      fontWeight: {
        regular: "var(--weight-regular)",
        semibold: "var(--weight-semibold)",
        bold: "var(--weight-bold)",
        black: "var(--weight-black)",
      },
      spacing: {
        0: "var(--space-0)",
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
        20: "var(--space-20)",
        24: "var(--space-24)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        raised: "var(--elevation-raised)",
        card: "var(--elevation-card)",
        overlay: "var(--elevation-overlay)",
        accent: "var(--elevation-accent)",
      },
      maxWidth: { container: "var(--container-max)" },
      transitionTimingFunction: {
        out: "var(--easing-out)",
        "in-out": "var(--easing-in-out)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      zIndex: {
        header: "var(--z-header)",
        sticky: "var(--z-sticky-bar)",
        overlay: "var(--z-overlay)",
      },
    },
  },
  plugins: [],
};

export default config;
