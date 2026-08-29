---
name: curbio-design
description: Use this skill to generate well-branded interfaces and assets for Curbio — the pre-listing home improvement partner for real estate agents — either for production or throwaway prototypes/mocks/brochures/slides. Contains essential design guidelines, colors, type, fonts, assets, verbatim brand lines, and UI kit components for prototyping.
user-invocable: true
---

# Curbio design skill

Read `README.md` within this skill, and explore the other files:

- `colors_and_type.css` — all CSS tokens (colors, type scale, spacing, radii, shadows, motion). **Always import this first.**
- `assets/` — logos (wordmark navy + white reversal, amber house mark, favicons), brochure reference photo.
- `ui_kits/brochures/` — the canonical Curbio interface: agent, homeowner, and brokerage tri-fold brochures, built as composable React components. The `index.html` shows all three side-by-side.
- `preview/` — small spec cards (colors, type, components) used by the Design System tab.

## What Curbio is

Curbio is "the pre-listing home improvement experts." A licensed general contractor that gets a listing market-ready on time and on budget, sold **to and through real estate agents**. The brand is editorial, calm, agent-protective. Deep navy + warm amber on Cloud White, with Pastel Sage and Stone as supporting backgrounds, and real before/after photography. Serif headlines (Lora) with one or two amber emphasis words — **same weight, upright. No italic.** **No emoji. No exclamation points.**

## When to use this skill

If the user invokes the skill without other guidance, ask them what they want to build — a brochure, a slide, a landing page, a one-pager? Ask:

1. Who's the audience — agent, homeowner, or brokerage?
2. Print or digital?
3. Do they have new photography to bring in, or use the placeholder?
4. Any verbatim copy from the brand lines they want to lead with?

Then act as an expert Curbio designer. Output static HTML files using the tokens in `colors_and_type.css` and the components in `ui_kits/brochures/`. Copy the assets out of this skill — don't reference them in place.

## Hard rules

- Headlines are **Lora**, navy, with one or two **amber** emphasis words. **Color only, never italic** — the 2026 guide forbids Lora italic.
- Navy is `#0D254D`.
- Amber is an accent, never the dominant color. If everything is amber, nothing is.
- Body type is **Libre Franklin** (not Mulish).
- Pastel Sage `#E2EBE5` is OK as a background or accent block, never for body text or headers.
- Teal is for backgrounds and banners only. **Never on text, never in the logo.**
- Most type on light backgrounds is **navy, not black**.
- Buttons are **amber pills**. Hover deepens to `--amber-110` with `--shadow-amber`. Never scale on hover.
- BEFORE/AFTER pill pairing is the signature device — navy "BEFORE" on the dim photo, amber "AFTER" on the bright one.
- "pre-listing" is hyphenated. "REALTOR®" carries the mark. Curbio is singular.
- No emoji, no unicode arrows/stars, no SVGs we draw ourselves. Use Lucide icons via CDN, or assets already in `assets/`.
- **Logo:** only navy + amber + white. Never over teal, amber, or sage. Favicon only in amber or white. White = real `#FFFFFF`.
