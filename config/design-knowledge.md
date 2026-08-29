# Design knowledge

Distilled from `docs/knowledge/design-system/` — `colors_and_type.css` (the
token source of truth), `README.md`, `SKILL.md`, and the Website Design Brief.
Loaded into the assistant's system prompt; the design system files are not read
at runtime.

This is the **public brand** system — what Curbio-branded pages, brochures and
collateral look like. The internal ops dashboard at `/admin` runs on a separate
token set (`app/(site)/admin/_ui/v2/tokens.css`, the `--ops-*` variables) which
is derived from these values but tuned for dense data screens. When generating
public-facing markup, use the tokens below.

---

## The feel

**Editorial, light, photo-led.** A luxury real-estate listing brochure — wide
margins, real before/after photography, calm navy with a warm amber accent,
lots of breathing room.

The test from the 2026 style guide: does this feel **sophisticated, airy,
modern, trusted, elegant, high-end, luxurious, polished, elevated, tasteful,
industry-leading, neutral?** If three or more land, it's on brand. If it feels
noisy, dated, cheap, or salesy, start over.

---

## Color

Values are exact. Do not approximate, do not "tidy," do not generate a tint
that isn't in the scale.

### Brand palette

| Token | Hex | Role |
|---|---|---|
| `--navy` | `#0D254D` | **Primary.** Headlines, body type, dark panels, footer bars, BEFORE labels. |
| `--amber` | `#CD8629` | **Single accent.** CTAs, emphasis words inside headlines, AFTER labels, star ratings. |
| `--teal` | `#176C67` | **Secondary.** Backgrounds, large color blocks, banners. |
| `--stone` | `#DFDCDA` | Neutral. Section dividers, photo mats, subtle accents. |
| `--sage` | `#E2EBE5` | **Pastel Sage** (new in 2026). Backgrounds, large color blocks, occasional accents. |
| `--cloud-white` | `#F7F7F7` | Default page background. |
| `--white` | `#FFFFFF` | Reversed type on navy, negative space, logo variants. Always *real* white, never off-white. |

### Usage rules — strict

| Color | Use for | **Never** use for |
|---|---|---|
| Navy | Primary headers, primary logo, banners, body text | Backgrounds, large color blocks, CTAs |
| Teal | Subheaders, accents, occasional CTAs | **Text of any kind. The logo.** Backgrounds behind the logo. Never paired loudly against amber. |
| Amber | Favicons, CTAs, accents, emphasis words in headlines | Body or long-form text, backgrounds, large color blocks. **Never the dominant color.** |
| Stone | Backgrounds, large color blocks, banners | Text |
| Pastel Sage | Backgrounds, large color blocks, subtle accents | Text, CTAs, primary headers |
| Cloud White | Backgrounds, large color blocks, banners | Text, CTAs |
| White | Text, backgrounds, logo/favicon | CTAs |

Three rules worth repeating because they are the ones most often broken:

1. **Amber is an accent, never dominant.** If everything is amber, nothing is.
2. **Teal never touches text and never touches the logo.**
3. **Most type on light backgrounds is navy, not black.**

The one sanctioned exception to "amber never on text": **short emphasis words
inside a headline.** Color only, same weight, upright.

### Derived scales

```
--navy-95  #1A335E   hover on navy buttons
--navy-85  #2E466F   pressed
--navy-30  #8A98AE   muted, captions
--navy-15  #C7CFDB   dividers on dark
--navy-08  #E4E8EE

--amber-110 #B5731F  hover / pressed amber
--amber-120 #9D6118
--amber-30  #F0DAB8  light amber, soft tints
--amber-10  #FAF1E3  faintest amber wash, info cards

--sage-110  #C9D6CE      --teal-110  #105752
--sage-50   #EFF4F1      --teal-30   #B1CCC9
```

### Semantic tokens

```
--bg          → --cloud-white     --fg          → --navy
--bg-elevated → --white           --fg-muted    #4A5A75
--bg-inverse  → --navy            --fg-subtle   → --navy-30
--bg-tint     → --amber-10        --fg-inverse  → --white
                                  --fg-accent   → --amber
--border        → --stone
--border-strong #BFBCBA
--border-dark   rgba(255,255,255,0.18)
--rule-accent   → --amber
```

### Contrast pairings (defaults)

Navy on Cloud White · White on Navy · Navy on Stone. Amber is for accents and
large display words only — never small body text on white.

### Imagery

Warm and true-to-life. Natural daylight interiors. Neutral, on-trend, turnkey
finishes. **No heavy filters, no grain, no black-and-white.** Whites stay
clean, wood tones stay warm. Real homes, never stock collages.

---

## Typography

A two-face editorial system. Both ship as variable TTFs in the design system's
`fonts/`.

| Use | Family | Token | Rules |
|---|---|---|---|
| Display / headlines | **Lora** (serif) | `--font-serif` | Regular + Bold only. **Never italic** — 2026 guide. |
| Body / subheads / labels | **Libre Franklin** (humanist sans) | `--font-sans` | Thin → Black. Italic is permitted where genuinely needed. |
| Code | system mono | `--font-mono` | |

Fallback stacks:

```css
--font-serif: 'Lora', 'Source Serif 4', Georgia, 'Times New Roman', serif;
--font-sans:  'Libre Franklin', -apple-system, BlinkMacSystemFont,
              'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
```

**Why this pairing.** Lora's serifs read as trustworthy, professional, and
class; Libre Franklin is sleek and screen-readable for body. Both convey
trusted, industry-leading, modern.

### The no-italic rule, and what replaces it

**Do not use Lora italic anywhere.** Emphasis inside a serif headline is
achieved by switching the word's **color to amber** — same weight, upright, no
font-style change. This is a deliberate change from V1 of the system. Libre
Franklin italic is fine when a sans-serif piece needs it.

### Type scale

```
--fs-hero   clamp(48px, 6.4vw, 88px)     --lh-tight    1.05
--fs-h1     clamp(40px, 4.6vw, 64px)     --lh-display  1.1
--fs-h2     clamp(30px, 3.2vw, 44px)     --lh-heading  1.2
--fs-h3     22px                         --lh-body     1.55
--fs-h4     18px                         --lh-loose    1.7
--fs-body   16px
--fs-small  14px                --tracking-label  0.14em  (uppercase eyebrows)
--fs-label  12px                --tracking-tight -0.01em  (serif headlines)
--fs-micro  11px
```

### Hierarchy

```
hero serif  →  optional amber rule  →  bold sans subhead
            →  sans body  →  uppercase eyebrow label
```

- `h1`/`h2` — Lora, navy, weight 600, `--tracking-tight`, `text-wrap: balance`,
  `font-style: normal`.
- `h3`/`h4` — Libre Franklin, weight 700, navy.
- `.eyebrow` — Libre Franklin **800**, 12px, `0.14em` tracking, all-caps, navy
  (or amber via `.eyebrow--amber`). This class is the system's connective
  tissue and appears everywhere.
- `.pullquote` — Lora 20px navy, upright, with a **72px amber opening quote
  mark** hung to the left. `cite` is bold sans, 14px.
- Links — navy, 1px underline at 3px offset, hover to amber.
- `::selection` — amber background, white text.

---

## Spacing

A 4px step scale. Tokens `--space-1` … `--space-24`:

```
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96
```

Reach for **24–48px** between-section gaps, **64–96px** for hero gaps. Wide
margins, generous gaps, one idea per block. Editorial pieces breathe.

The brochure grid is a **three-column tri-fold**, each panel ~3.66in × 8.5in
(320 × 780 in the component kit). Panels are independent units of meaning.

---

## Radii

| Token | Value | Use |
|---|---|---|
| `--r-none` | 0 | |
| `--r-sm` | 4px | Tags, badges |
| `--r-md` | 8px | Inputs, small cards |
| `--r-lg` | 12px | Cards, photo mats |
| `--r-xl` | 20px | Hero panels, soft testimonial cards |
| `--r-pill` | 999px | **Buttons (the default)**, QR circles, icon disks, BEFORE/AFTER tags |

**Pills are the brand's button shape.** Never sharp rectangles for CTAs.

---

## Shadows and elevation

Restrained and editorial — two-layer, **navy-tinted**, never blown-out grays.

```css
--shadow-sm:    0 1px 2px  rgba(13,37,77,.06), 0 1px 1px rgba(13,37,77,.04);
--shadow-md:    0 4px 12px rgba(13,37,77,.08), 0 1px 2px rgba(13,37,77,.04);
--shadow-lg:    0 16px 40px -12px rgba(13,37,77,.18), 0 4px 12px rgba(13,37,77,.06);
--shadow-amber: 0 8px 24px -8px rgba(205,134,41,.45);   /* amber CTA hover only */
```

`--shadow-sm` chips and tags · `--shadow-md` default card lift · `--shadow-lg`
focused/hovered cards and photo mats.

**No inner shadows. No neumorphism. No glow.**

---

## Motion

```css
--ease-out:    cubic-bezier(.22,.61,.36,1);
--ease-in-out: cubic-bezier(.45,.05,.55,.95);
--dur-fast: 120ms   --dur-base: 220ms   --dur-slow: 420ms
```

Buttons **never scale on hover** — the amber CTA deepens to `--amber-110` and
gains `--shadow-amber`.

---

## Component conventions

**Cards.** White fill, `--r-lg`, `--shadow-md`. Optional 1px stone border on
low-contrast surfaces. Photo cards inset the photo with a 12px white mat. Quote
cards get a warm Stone wash and the amber quotation mark.

**Buttons.** Amber pills. Hover deepens to `--amber-110` with `--shadow-amber`.
Never scale.

**The short amber rule.** 56 × 3px, sat under or beside a headline — the
brand's signature divider. `.rule-amber`.

**BEFORE / AFTER pills.** The signature device: navy `BEFORE` on the dim photo,
amber `AFTER` on the bright one. Pill radius, uppercase eyebrow type.

**Borders and dividers.** Card and photo borders `1px solid var(--stone)`, or
no border plus a soft shadow. Table dividers 1px stone between rows, navy fill
on the header row.

**Backgrounds.** Cloud White and Stone carry the page. **Full-bleed
photography is the one approved background**, for hero panels and back covers.
Navy panels are flat solid navy — no tints, no overlays — used for CTA closers
and footer bars.

**Banned outright:** gradients, mesh gradients, bluish-purple gradients,
patterns, textures, hand-drawn illustrations, glassmorphism, grain. This brand
is *paper-real*, not *web 3.0*.

**Icons.** Lucide, via CDN. **Do not draw SVG icons by hand.** No emoji, no
unicode arrows or stars.

**Logo.** Navy, amber, and white only. Never over teal, amber, or sage.
Favicon only in amber or white. White means real `#FFFFFF`.

**Chrome.** No fixed sticky chrome in print collateral. On digital surfaces a
fixed navy bar at the top is acceptable.

### Built components

Exposed by the design system's brochure kit: `Brochure`, `Panel`,
`AgentBrochure`, `HomeownerBrochure`, `BrokerageBrochure`. Shared primitives:
`Wordmark`, `HouseMark`, `Eyebrow`, `AmberRule`, `SerifH`, `PullQuote`,
`StarRow`, `PillButton`, `BeforeAfter`, `FeatureRow`, `IconDisc`, `Icon`,
`QRDisc`, `ComparisonTable`, `NavyCloser`, `NavyBrandBar`.

---

## Hard rules — the checklist

1. Headlines are Lora, navy, with one or two amber emphasis words —
   **color only, never italic.**
2. Navy is `#0D254D`. Amber is `#CD8629`. Exact values.
3. Amber is an accent, never dominant.
4. Body type is Libre Franklin — **not Mulish**.
5. Pastel Sage is background or accent only. Never text, never CTAs.
6. Teal is backgrounds and banners only. Never on text, never in the logo.
7. Most type on light backgrounds is navy, not black.
8. Buttons are amber pills. Hover deepens; never scales.
9. BEFORE/AFTER pill pairing is the signature device.
10. `pre-listing` is hyphenated. `REALTOR®` carries the mark. Curbio is
    singular.
11. **No emoji. No exclamation points.** No unicode arrows or stars. No
    hand-drawn SVG.
12. Logo in navy, amber, or white only.
