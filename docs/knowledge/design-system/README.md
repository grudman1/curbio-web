# Curbio Design System

> The pre‑listing home improvement experts. A design system for generating on‑brand collateral — brochures, decks, slides, and digital surfaces — that feels **editorial, trustworthy, and effortless.**

---

## What Curbio is (in one screen)

Curbio is the agent's pre‑listing home improvement partner. They're a licensed general contractor that gets a listing market‑ready *on time and on budget*: fast estimates, design + materials, full‑service project management, and pay‑at‑closing financing for qualified sellers — all coordinated by one Curbio project manager. The product is sold **to and through real estate agents**, who recommend Curbio to their seller clients; brokerages can also white‑label the offering as their own "Concierge" program.

The three brochures this system was built for:

| Audience | Hero promise | Tone |
|---|---|---|
| **Real estate agents** | "The one call that does it all." Win more listings, protect your reputation, fast starts + on‑time completion. | Partner‑to‑partner, outcome‑focused |
| **Home sellers / homeowners** | "Get your home market‑ready — *without managing the work yourself*." | Warm, calm, simple |
| **Teams & brokerages** | A recruit‑and‑retain Concierge offering, available as Curbio or white‑labeled. | Strategic, credible |

---

## Sources used to build this system

These materials were attached to the project and informed every decision below. Store these locations in case you need to revisit them — assume the next reader does **not** have access and that you'll need to re‑attach if you want to dig deeper.

- `uploads/Curbio_Concierge_Style_Guide.pdf` — the canonical brand style guide (colors, type, voice)
- `uploads/Curbio Main.png` / `Main White.png` — wordmark, navy + white reversals
- `uploads/Curbio Favicon Solid.png` / `Favicon.png` / `Favicon White.png` — house icon mark variants
- `Materials/` (locally mounted) — agent overview deck, brokerage quick‑start, homeowner pre‑sale checklist, sample tri‑fold brochure photo
- `Materials/Curbio_Concierge_Style_Guide.md` — the markdown version of the style guide (with verbatim brand lines)

All distilled into the files in this project. No Figma or codebase was provided — the system is built from the PDFs + style guide.

---

## Repository index

```
.
├── README.md                  ← you are here
├── SKILL.md                   ← Claude Code skill entry point
├── colors_and_type.css        ← all color + type tokens (import this first)
├── assets/                    ← logos, favicons, sample brochure image
├── fonts/                     ← brand .ttf files — Lora + Libre Franklin (incl. italic)
├── preview/                   ← Design System tab cards
├── ui_kits/
│   └── brochures/             ← Agent, Homeowner, Brokerage tri-fold UI kit
└── slides/                    ← (intentionally omitted — no slide template was provided)
```

> **A note on fonts.** Curbio's brand fonts ship in this project: `fonts/Lora.ttf`, `fonts/LibreFranklin.ttf`, and `fonts/LibreFranklin-Italic.ttf` — all variable-axis TTFs, wired in via `@font-face` at the top of `colors_and_type.css`. **Do not use Lora italic** — emphasis is amber color, upright. Libre Franklin italic is fine when needed.

---

## Components

Built components, exposed on `window.CurbioDesignSystem_882732` (source: `ui_kits/brochures/`):

- **Brochure** — tri-fold container; renders its `Panel` children side by side with fold dividers.
- **Panel** — one brochure panel (320 × 780), optional `bg` and `noPadding`.
- **AgentBrochure** — the agent tri-fold, four panels.
- **HomeownerBrochure** — the home-seller tri-fold, four panels.
- **BrokerageBrochure** — the brokerage / Concierge tri-fold, four panels.

Shared primitives (`ui_kits/brochures/primitives.jsx`): `Wordmark`, `HouseMark`, `Eyebrow`, `AmberRule`, `SerifH`, `PullQuote`, `StarRow`, `PillButton`, `BeforeAfter`, `FeatureRow`, `IconDisc`, `Icon`, `QRDisc`, `ComparisonTable`, `NavyCloser`, `NavyBrandBar`.

---

## CONTENT FUNDAMENTALS

Curbio's voice is **trusted, expert, reassuring, and refreshingly plain.** We sound like the dependable pro who has done this thousands of times and makes it easy.

### Voice attributes

- **Reassuring.** We sell *peace of mind*. Use words like *hassle‑free, stress‑free, simple, on time, on budget, taken care of, list with confidence.*
- **Expert & confident.** Thousands of successful projects, licensed and insured, "we cross the finish line with you." Confident — never boastful.
- **Agent‑protective.** The agent is the trusted local advisor. Curbio *simply steps in as the contractor.* Never talk past or above the agent.
- **Clear.** Short sentences. Concrete benefits. No contractor jargon, no hype.

### What we avoid

Pushy sales language, fear‑mongering, exclamation overload, buzzwords, anything that undercuts the agent's authority, and over‑promises ("guaranteed profit," "double your commission").

### Casing & micro‑style

- **Brand name** is `Curbio` (sentence case in body), `curbio` (lowercase in the wordmark only). Singular: *Curbio does the work*, not *Curbio do*.
- **`pre‑listing`** is hyphenated, every time.
- **`REALTOR®`** always carries the registered mark.
- **No emoji.** Not in any collateral. Not even one.
- **No exclamation points** in headlines or body. Calm. The only acceptable `!` is the absolute rare hype moment ("Get started!") in app CTAs, and even then we usually drop it.
- **Sentence case** for headlines, except all‑caps eyebrow labels (`DEDICATED PROJECT MANAGEMENT`, `BEFORE`, `AFTER`).
- **First person plural** internally (*we*, *our team*, *we'll*), **second person** to the reader (*you*, *your listings*, *your clients*). Never *I*.
- **CTAs are short and active.** *Request a free estimate. · Ask your agent. · Get started.* No "click here," no "learn more."

### Verbatim brand lines — reuse these, don't reinvent

- "The pre‑listing home improvement experts."
- "The one call that does it all."
- "From start to finish."
- "On time and on budget."
- "List with confidence. We'll take care of the rest."
- "Fast starts, on‑time completion, and expert service."
- "Today's buyers want move‑in ready homes."
- "Get your home market‑ready — without managing the work yourself."
- "One team. One timeline. One accountable partner."
- "Update before you list."

### Headline pattern (use everywhere)

Serif headline in **navy**, with **one or two amber emphasis words.** Pick the verb or the value word. The emphasis is *color only* — same weight, **no italic**.

> Today's buyers want <span style="color:#CD8629">**move-in ready**</span> homes.
> Get your home market-ready — <span style="color:#CD8629">**without**</span> managing the work yourself.
> One team. One timeline. One <span style="color:#CD8629">**accountable**</span> partner.

Never make the whole headline amber. If everything is amber, nothing is.

---

## VISUAL FOUNDATIONS

The system is **editorial, light, and photo‑led.** Imagine a luxury real‑estate listing brochure — wide margins, real before/after photography, a calm navy + warm amber accent, and lots of breathing room.

### Adjectives every design should trigger

From the 2026 style guide, ask yourself: does this design feel **sophisticated, airy, modern, trusted, elegant, high-end, luxurious, polished, elevated, tasteful, industry-leading, neutral?** If three or more land, you're on brand. If it feels noisy, dated, cheap, or salesy, start over.

### Color usage rules (2026 guide)

Each color has clear *use-fors* and *don't-use-fors*. Follow these strictly. Note the **amber-for-emphasis allowance**: we permit amber on *short* emphasis words inside a headline, even though the strict reading of the guide forbids amber on any text.

| Color | Use for | Don't use for |
|---|---|---|
| **Navy** `#0D254D` | Primary headers · primary logo · banners | Backgrounds · large color blocks · CTAs |
| **Teal** `#176C67` | Subheaders · accents · occasional CTAs | Backgrounds · large color blocks · primary headers |
| **Amber** `#CD8629` | Favicons · CTAs · accents · emphasis words in headlines | Body / long-form text · backgrounds · large color blocks |
| **Stone** `#DFDCDA` | Backgrounds · large color blocks · banners | Text |
| **Pastel Sage** `#E2EBE5` | Backgrounds · large color blocks · subtle accents | Text · CTAs |
| **Cloud White** `#F7F7F7` | Backgrounds · large color blocks · banners | Text · CTAs |
| **White** `#FFFFFF` | Text · backgrounds · logo / favicon | CTAs |

### Color

Brand palette — values are exact, do not approximate.

| Token | Hex | Role |
|---|---|---|
| `--navy` | `#0D254D` | **Primary**. Headlines, body type, dark panels, footer bars, "BEFORE" labels. **Most type on light backgrounds is navy, not black.** |
| `--amber` | `#CD8629` | Single accent. CTAs, emphasis words inside headlines, AFTER labels, star ratings, primary banners. **Never the dominant color.** |
| `--stone` | `#DFDCDA` | Neutral. Section dividers, photo mats, subtle accents. |
| `--sage` | `#E2EBE5` | **Pastel Sage** (new in 2026). Backgrounds, large color blocks, occasional accents. Don't use for primary headers, text, or large CTAs. |
| `--cloud-white` | `#F7F7F7` | Default page background. Keeps the layout breathing. |
| `--teal` | `#176C67` | Secondary. Backgrounds, large color blocks, banners. **Never in the logo. Never on text. Never paired loudly against amber.** |
| `--white` | `#FFFFFF` | Reversed type on navy. Negative space. Logo / favicon variants. Always *real* white, never off-white. |

**Color vibe of imagery:** warm and true‑to‑life. Natural daylight interiors. Neutral, on‑trend, turnkey finishes. **No heavy filters, no grain, no B&W.** Whites stay clean, wood tones stay warm.

**Contrast pairings (default):** Navy on Cloud White · White on Navy · Navy on Stone. Amber is for accents and large display words only — never small body text on white.

### Typography

A two-face editorial system.

| Use | Family | Token | Notes |
|---|---|---|---|
| Display / Headlines | **Lora** (serif) | `--font-serif` | Regular + Bold only. **Do not use Lora italic** (2026 guide). |
| Body / Subheads / Labels | **Libre Franklin** (humanist sans) | `--font-sans` | Thin → Black available. Italic is OK if necessary. |

**Why this pairing.** Lora's serifs read as trustworthy, professional, and class — paired with Libre Franklin ("Lee-bruh") for sleek, sans, screen-readable body. Both convey *trusted*, *industry-leading*, *modern*, *sleek*, *tech*.

**Emphasis pattern.** When you need to highlight a word inside a serif headline, change its **color to amber** (`var(--amber)`) and keep it upright — same weight, same style. **No italic.** This is a deliberate change from V1.

Hierarchy: hero serif → optional amber rule → bold sans subhead → sans body → uppercase eyebrow label. The `.eyebrow` class (Libre Franklin 800, 12px, `0.14em` tracking, all-caps) is everywhere — it's the system's connective tissue.

### Spacing & layout

- **Wide margins, generous gaps.** One idea per block. Editorial pieces breathe.
- **Three‑column tri‑fold** is the brochure grid. Each panel ~3.66 in × 8.5 in. Panels are independent units of meaning.
- **Spacing scale** in 4 px steps: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96 (tokens `--space-1` through `--space-24`). Reach for 24–48 px for between‑section gaps, 64–96 px for hero gaps.
- **No fixed sticky chrome** in print collateral. In digital surfaces, a fixed navy bar is acceptable at the top.

### Backgrounds

- **Cloud White and Stone carry the page.** No gradients, no patterns, no textures, no hand‑drawn illustrations.
- **Full‑bleed photography** is the *one* approved background — used for hero panels and back covers. Photos are real homes, never stock collages.
- **Navy panels** are flat solid navy. No tints, no overlays. Used for CTA closers and footer bars.
- **No bluish‑purple gradients. No mesh gradients. No glassmorphism. No grain.** This brand is *paper‑real*, not *web 3.0*.

### Borders & dividers

- **The "short amber rule"** — 56 × 3 px, sat under or beside a headline — is the brand's signature divider. Use `.rule-amber` or `hr.rule-amber`.
- Card/photo borders: `1 px solid var(--stone)`, or no border + soft shadow.
- Table dividers: 1 px stone between rows; navy fill on the header row.

### Shadows & elevation

Restrained, editorial. Two‑layer navy‑tinted shadows, never blown‑out grays.

- `--shadow-sm` — chips, tags, subtle lift
- `--shadow-md` — default card lift
- `--shadow-lg` — focused / hovered cards, photo mats
- `--shadow-amber` — only on the amber CTA on hover

**No inner shadows.** No neumorphism. No glow.

### Corner radii

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 4 px | Tags, badges |
| `--r-md` | 8 px | Inputs, small cards |
| `--r-lg` | 12 px | Cards, photo mats |
| `--r-xl` | 20 px | Hero panels, soft testimonial cards |
| `--r-pill` | 999 px | **Buttons (the default), QR circles, icon disks, BEFORE/AFTER tags** |

Pills are the brand's button shape — never sharp rectangles for CTAs.

### Cards

Default card: white fill, `--r-lg` radius, `--shadow-md`. Optional 1 px stone border for low‑contrast surfaces. Photo cards have an inset photo with a 12 px white mat. Quote cards have a warm Stone wash + amber quotation mark.

### Buttons & interaction states

- **Primary** — solid amber pill, white text, Mulish 700, 16 px, uppercase optional. Hover → deeper amber (`--amber-110`) + `--shadow-amber`. Press → darken further, no transform. Never shrink.
- **Secondary** — navy outline pill, navy text on transparent. Hover → fill navy / text white.
- **Tertiary / link** — navy text, 1 px underline 3 px below baseline. Hover → switch to amber.
- **Disabled** — 40 % opacity, `cursor: not-allowed`. No greyscale conversion.

### Motion

- **`--dur-base` 220 ms** is the default transition. **`--ease-out`** for entrances, **`--ease-in-out`** for state toggles.
- Fade + 8 px rise on entrance. No bounce. No spring. No rotation tricks.
- Scroll‑triggered reveals stagger at 80 ms per child, max 5 children before falling through.
- Hover/press states change *color and shadow*, never scale or skew. The brand is calm.

### Transparency & blur

Used **rarely**. The only place blur appears is the navy footer bar over a hero photo: a 12 px backdrop blur with `rgba(13,37,77,0.82)`. Never on cards, never on chips. The brand is opaque.

### Photography rules (essentials)

- Real homes, beautifully lit, natural daylight.
- Before/After is the signature pairing. **Navy "BEFORE" pill on the dim image; amber "AFTER" pill on the bright one.**
- Warm wood tones, clean whites, neutral on‑trend finishes.
- People when shown: diverse, at‑ease, mid‑conversation. Never posed corporate stock.
- No heavy filters. No B&W. No tilt‑shift.

### Layout rules (fixed elements)

- **Footer bar** on every page: navy fill, `curbio` wordmark in white, tagline (`The pre-listing home improvement experts.`) right‑aligned.
- **Cover panel** of every brochure leads with a hero photo + serif headline + short amber rule + sub.
- **Closing panel** of every brochure: navy CTA with white type + amber pill button + amber QR disk.
- Page edges: minimum 32 px margins on digital, 0.375 in on print.

---

## LOGO RULES

Per the 2026 style guide, logo usage tightened. Stick to these:

- **Use the dual-tone navy + amber wordmark whenever possible.** Solid navy or solid white wordmarks are reserved for swag / print where dual-tone won't reproduce, and only with approval.
- **Only navy, amber, and white** appear in logo variations. **Letters never in teal.** Favicons only in amber or white.
- **Never layer the logo over teal, amber, or pastel sage.** Stone, Cloud White, White, and Navy backgrounds are all fine.
- **White means real white** (`#FFFFFF`). Never off-white, cream, or warm white.
- **Don't recolor, stretch, rebuild in a body font, or add effects.** Give the wordmark room.
- **Co-branding lockup:** `[Partner / Your Logo]  |  curbio` — partner left, thin vertical divider, Curbio right. Reverse to white on dark footer bars.

## ICONOGRAPHY

Curbio's collateral uses **thin, single‑weight line icons inside soft Stone circles**, paired with an uppercase label + a single supporting sentence. The look is consistent with the brochure reference: simple, geometric, never illustrative.

### What we use

- **[Lucide](https://lucide.dev/)** is the chosen CDN icon set — it's open‑source, has the right thin‑line aesthetic, and ships every glyph the brochures call for (`users`, `shield-check`, `home`, `phone`, `dollar-sign`, `clock`, `truck`, `wrench`, `paintbrush`, etc.). Loaded via `https://unpkg.com/lucide@latest`.
- **Stroke width: 1.75.** This matches the brochure samples best.
- **Color: navy.** Icons always render in `var(--navy)`. Never amber. The amber lives in the *disc* around the icon for emphasis moments — e.g. the amber QR circle.
- **Container: 64 × 64 Stone disc** (`background: var(--stone); border-radius: 999px;`) is the standard feature‑list icon presentation. Smaller (40 × 40) inline.

> ⚠️ **Substitution flag.** Curbio's official collateral was rendered with custom illustrated line icons (likely commissioned, not from a public set). We substitute Lucide because: (a) the visual weight is the closest open match, (b) the user can swap any icon by changing a single attribute, and (c) it ships every concept needed for these brochures. **If Curbio's custom icon SVGs are available, drop them into `assets/icons/` and update the `<Icon>` component in `ui_kits/brochures/`.**

### Other glyph rules

- **No emoji.** Anywhere. Ever. This is a print‑credibility brand.
- **No unicode "icon" chars** (★, ✓, →). The one exception is the **amber five‑star testimonial** — set in inline SVG, not the Unicode star. (See `<StarRow>` in the UI kit.)
- **The house mark** (`assets/logo-house-amber.png` / `logo-house-c.png`) is a logo, not an icon. Use it in app/badge/QR contexts, never inline with body type.
- **No SVGs drawn by us.** If a needed glyph isn't in Lucide and isn't already in `assets/`, ask for the source asset rather than inventing one.

### Star rating (testimonial)

Five amber Lucide `star` icons, 16 × 16, `fill: var(--amber); stroke: var(--amber);`. Spaced 4 px apart. Always to the *right* of a testimonial card or beneath the testimonial name line.

### QR codes

Always inside an **amber disc**, 88 × 88 px minimum, with the QR rendered in **navy on cloud white** at the center. The amber disc is the "spark" that says *primary action.* See `<QRDisc>` in the brochures kit.

---

## PHOTOGRAPHY DIRECTION

From the 2026 imagery section. Hit these adjectives: **gorgeous, classy, honest, crisp, elegant, inviting, modern, luxurious.**

- **Real Curbio project photos preferred** — stock is the fallback, not the default.
- **Interiors and exteriors both**, with curb-appeal pairing well with kitchen/bath interior shots.
- **High-key (bright).** Lift the shadows. No moody underexposed shots.
- **Balanced white.** Not too warm, not too cool. Whites stay neutral; wood tones don't go orange.
- **Crisp focus.** No soft-focus, no heavy filters, no grain, no B&W.
- **People (when shown)** are warm, diverse, at-ease, mid-conversation. Never stiff corporate stock.
- **Before/After is the signature pairing.** Navy `BEFORE` pill on the dim/dated image, amber `AFTER` pill on the bright/turnkey image.

## How to use this system

1. **Always import** `colors_and_type.css` first. All tokens live there.
2. **Lean on the brand lines.** Don't write fresh marketing copy when one of the verbatim lines fits.
3. **Headline = serif + one or two amber italic words.** This is the brand's signature move.
4. **Lay it out with breathing room.** When in doubt, add 16 px.
5. **Photography is the hero.** Real homes, before/after pairing, navy "BEFORE" + amber "AFTER" pills.
6. **Buttons are amber pills.** Everything else is secondary.
7. **Respect the agent.** Even in homeowner pieces, the framing is *your agent recommends Curbio*.

---

## Caveats

- **Fonts** are loaded as Google Fonts (Lora + Libre Franklin). Both match the 2026 brand spec; no substitution needed.
- **Icon set substituted** (Lucide) — flagged in the Iconography section. Swap to custom Curbio icons if shared.
- **No Figma file or codebase** was attached, so the UI kit is built from the PDFs + style guide + the brochure photograph. Pixel‑level fidelity to the printed pieces is approximate.
- **No slide template kit** is included — the brief was the tri-fold brochure set; ask if a slide kit is also wanted.
- **`assets/brochure-reference.jpg`** predates the 2026 rebrand and uses italic Lora + old navy. Use it as a layout reference only — do not copy the italic emphasis or the V1 navy color.
