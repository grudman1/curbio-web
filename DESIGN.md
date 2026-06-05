# Design

Canonical source: `Curbio Website Design Brief (standalone).html`. Implemented in
`app/globals.css` (`:root` tokens + `.lp-*` classes). This file documents the system;
the brief wins on any conflict.

## Theme
Light, editorial, print-brochure calm. Cloud-white and white surfaces carry the
page; navy is the ink; amber is the single accent. No dark mode. Strategy:
**Restrained** (tinted neutrals + one accent ≤10% of surface). Amber never becomes
a base or body color.

## Color
| Token | Hex | Role |
|---|---|---|
| navy | `#0D254D` | Primary ink, headlines, navy panels, footer |
| amber | `#CD8629` | Accent only: CTAs, focus rings, 1–2 emphasis words |
| amber-hover | `#B5731F` | CTA hover |
| amber-active | `#9D6118` | CTA active / error text on light |
| amber-ring | `#F0DAB8` | Focus ring (3px) |
| stone | `#DFDCDA` | Quiet dividers, icon discs, sold-strip bg |
| sage | `#E2EBE5` | Before/after section bg only |
| cloud | `#F7F7F7` | Default page bg, hero bg |
| white | `#FFFFFF` | Cards, form card, inputs |
| fg-muted | `#4A5A75` | Body / subhead / eyebrow ink (≥4.5:1 on cloud) |
| navy-30 | `#8A98AE` | Placeholders, fine print (large/secondary only) |
| border | `#BFBCBA` | Input borders |
| error | `#E24B4A` | Inline validation only |

Contrast: body uses `fg-muted #4A5A75` on cloud/white (≈7:1). `navy-30` is reserved
for placeholders and ≤12px legal fine print, never body. Teal exists in the palette
but is **never** used on text.

## Typography
- **Display:** Lora 600 (`--font-serif`). Headlines only, upright, never italic.
  Identity font from the brief; kept despite being a common pick because the brand
  has already committed to it (identity-preservation).
- **Body/UI:** Libre Franklin (`--font-sans`), weights 400/600/700/800.
- **Eyebrow:** LF 800, 12px, `0.14em`, uppercase, fg-muted. Used sparingly (section
  labels), not above every block.
- **Scale:** hero `clamp(32px,6vw,76px)`; h2 `clamp(30px,3.2vw,44px)`; body 16/1.55;
  fine print 11px. `text-wrap: balance` on headlines.
- **Signature move:** navy Lora headline with 1–2 amber emphasis words (color only,
  upright — not italic, not bold).

## Radii & Shadows
- Radii: pills/tags `999px` · cards `12px` · panels/form card `20px` · inputs `8px`.
- Shadows (navy-tinted): sm `0 1px 2px rgba(13,37,77,.06)`; md `0 4px 12px
  rgba(13,37,77,.08), 0 1px 2px rgba(13,37,77,.04)`; amber `0 8px 24px -8px
  rgba(205,134,41,.45)` (CTA hover only).

## Components
- **FormCard** (`#quote-form`): white, radius 20, shadow md, no border, pad 32.
  Inputs 48px, radius 8, 1px border, 16px text, amber focus ring. Submit: full-width
  amber pill, 52px. Success replaces fields with a centered check + two lines.
- **Sold card**: white, radius 12, shadow sm, 140px photo, absolute amber "Sold" pill.
- **Icon**: Lucide line, stroke 1.75, navy, inside a stone disc. Never amber.
- **Sticky bottom bar**: navy, 56px, fixed, amber pill right; reveals after the hero
  scrolls out (IntersectionObserver), hides when the form re-enters view.

## Motion
Entrance = fade + 8px rise, 220ms ease-out. Hover changes color/shadow only, never
layout. Sticky bar fades 220ms. Every animation has a `prefers-reduced-motion: reduce`
fallback (instant / crossfade).

## Anti-slop guardrails (project-specific)
No em-dashes in copy (periods, commas, middots). No exclamation points. Sentence case
except eyebrows. No purple, gradients, glassmorphism, emoji, unicode stars/arrows. No
stock smiling-team photos. "agents" not "REALTORS" unless ® is shown. pre-listing is
hyphenated. Curbio is singular.
