# Design — the app (/admin)

The design system for the operational product at `/admin` (and the legacy
`/marketing` routes that render the same screens). Separate from `DESIGN.md`
on purpose: that file is the marketing site's editorial voice (Lora, navy
panels, photography). The app is a product someone works in daily — it gets a
product voice. Nothing in this file applies to public pages.

Register: **product** — boring-good, predictable, dense, fast. The reference
family is HubSpot / Pipedrive / Instantly / Attio: light neutral ground, white
cards, muted status pills, obvious interactive affordances, everything
editable where it lives.

## Principles

1. **Edit in place.** Data the owner types lives in the table that displays
   it: click the cell, type, Enter saves, Esc cancels. Anything too big for a
   cell opens a right-side drawer. There is no "form at the bottom of the
   page" anywhere in the app.
2. **Prose budget is zero.** No explanatory paragraphs on any screen. A fact
   that must survive goes behind an ⓘ popover or a `title` tooltip; the
   default is deletion.
3. **Data honesty outranks styling** (unchanged from the previous era):
   missing data renders an em-dash, never a zero; `unknown` is grey and
   dashed, never on the good/warn/bad ramp; self-reported numbers carry the
   `logged` tag; unwired surfaces carry their wiring pill.
4. **One vocabulary.** The same button, pill, table, drawer and toast on
   every screen. A screen earns no custom furniture.

## Tokens

Three layers, same architecture as the site: primitives in `globals.css`
(`--slate-*`, `--green-*`, `--red-*`, `--blue-*`, `--shadow-app-*`), semantic
roles in `tokens.css` (`--app-*`, `--pill-*`), utilities in
`tailwind.config.ts` (`bg-app-bg`, `border-app-border`, `bg-pill-good-bg`, …).
Components never carry a hex.

### Surfaces

| Token | Value | Role |
|---|---|---|
| `--app-bg` | slate-25 `#F8F9FB` | page ground |
| `--app-card` | white | cards, panels, inputs, drawers |
| `--app-well` | slate-50 `#F1F3F7` | hover fills, table heads, inset strips |
| `--app-border` | slate-100 `#E8EAF0` | card + row hairlines |
| `--app-border-strong` | slate-200 `#D7DBE4` | inputs, segmented controls |

Cards: `rounded-lg` (12px) + `border-app-border` + `shadow-app-card`.
Overlays (popovers, palette): `shadow-app-pop`. Drawer: `shadow-app-drawer`.

The warm site neutrals (stone, cloud) do not appear in the app; the cool
slate family is what makes the tool read as a product and not the brochure.

### Color roles

- **Navy** = primary actions and the nav accent. Nothing else.
- **Amber** = signal/highlight only (warning tone, focus rings). Never a
  button, never decoration.
- **Status** is the four-tone scale (`tone.ts`): `good / warn / bad /
  unknown`, rendered as muted pills — tinted fill + darker text of the same
  hue (`--pill-*-bg/fg` pairs, all AA at pill sizes). `unknown` is a dashed
  outline with no fill, by rule. `info` (blue) exists for purely
  informational badges; it is not on the tone ramp.
- Neutral chips (tier badges, counts): `--pill-neutral-*`.

### Typography

Libre Franklin for **everything** — headings included. Serif does not appear
in the app. The operational scale (`--ops-*`) is the working set:

| Class | Size | Use |
|---|---|---|
| `text-ops-title` | 20px/650 | page title (sans now) |
| `text-ops-metric` | 24px/650 tabular | StatCard value |
| `text-ops-card-title` | 14px/600 | card titles, sentence case |
| `text-ops-body` / `text-ops-table` | 13px | the workhorse |
| `text-ops-label` | 12px | metadata, provenance |
| `text-ops-micro` | 11px caps | column headers only |

Numbers are always `tabular-nums`.

## Components (`app/(site)/admin/_ui/`)

| Component | Contract |
|---|---|
| `AppShell` | light topbar (timeframe, attribution, user) + sidebar + content; mounts `ToastProvider` and `CommandPalette` |
| `Sidebar` | light rail, grouped nav, filled rounded active item, collapsible to icons (persisted), neutral T1 chips |
| `PageHeader` | sans title + one-line meta slot + right-hand actions. No paragraphs |
| `StatCard` | KPI card: label, value (`null` → em-dash), delta, sparkline, ⓘ. Top of every screen that has numbers |
| `Card` / `Panel` | white card, 14px sentence-case title, right slot |
| `DataTable` (`Table/Th/Td`) | 13px rows, 11px-caps head, right-aligned numerics, row hover fill, row actions revealed on hover/focus |
| `InlineCell` | click-to-edit cell (number/text): Enter saves, Esc cancels, optimistic value, saved flash, error toast + revert |
| `Drawer` | right-side panel (`<dialog>` semantics, focus trap, Esc, backdrop) for create/edit of entities. Footer: primary save + ghost cancel + (archive) |
| `Toast` | `useToast()` → success/error, bottom-right, auto-dismiss, reduced-motion safe |
| `CommandPalette` | ⌘K: jump to any screen/subtab, carries the current timeframe query |
| `SegmentedControl` | first/last-touch, week picker, any 2–5-way switch |
| `TimeframePicker` | popover month/range picker in the topbar, grain-aware |
| `Badge` | the status pill (`tone` prop); `dashed` outline for unknown |
| `Button` | `primary` (navy) / `secondary` (bordered white) / `ghost` / `danger`; sm + md |
| `Field` (`Input/Select/Textarea/DateInput/NumberInput`) | drawer + toolbar form controls, 13px, `--app-border-strong`, amber focus ring |
| `EmptyState` | icon, one sentence, one primary action; optional collapsed needs list |
| `Skeleton` | shimmer blocks; every route ships a `loading.tsx` (tiles + table), never a blank flash |
| `LoggedTag` / `Provenance` / `DASH` | the honesty markers, unchanged semantics |

## Interaction

- **Inline edit** is the default for any cell the owner types (counts, ARM,
  amounts). Save on Enter or blur; Esc reverts; the cell flashes
  `--pill-good-bg` for ~800ms on confirm; failures toast the server error and
  revert the cell. Optimistic always.
- **Drawers** for multi-field create/edit (spend, events, partnerships).
  Never a modal for data entry; never a pinned form.
- **Row actions** (edit / archive / restore) are icon buttons, visible on row
  hover and on focus-within — no underlined text links in data columns.
- **Toasts** confirm every write. No silent saves, no full-page reloads
  (server-action + `router.refresh()`).
- **Keyboard**: everything operable without a mouse — palette (⌘K), drawers
  (Tab-trapped, Esc), inline cells (Enter/Esc), segmented controls (arrows).
- **Motion**: 120–220ms, ease-out, state changes only. Full
  `prefers-reduced-motion` fallbacks. No entrance choreography.

## Layout

- Content max-width 1440px; screen = `PageHeader` → StatCard row (when the
  screen has KPIs) → cards.
- Grid gaps `--ops-gap` (12px); card padding `--ops-panel-pad` (16px).
- Topbar is the per-screen toolbar (timeframe + attribution live there,
  sticky). Screens add their own controls to `PageHeader`'s right slot.
- Responsive to laptop widths; below `md` the sidebar becomes a drawer and
  wide tables scroll inside their card (`overflow-x-auto`), never the page.

## What did not change

Attribution semantics (first/last-touch, the ten-channel closed list), the
grain rules, every data-honesty rule above, and the route structure. This
system restyles the surface; it does not touch what the numbers mean.
