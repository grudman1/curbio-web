// Manifest of the semantic token layer in app/tokens.css.
//
// /design-system renders from THIS list, so a token that exists but isn't
// listed shows up as missing from the reference rather than silently going
// undocumented. Keep in sync when adding tokens — the list is the contract.

export type TokenGroup = {
  title: string;
  note?: string;
  /** CSS custom property names, without the leading `--`. */
  tokens: string[];
};

export const COLOR_GROUPS: TokenGroup[] = [
  {
    title: "Brand",
    tokens: [
      "color-brand",
      "color-brand-muted",
      "color-brand-subtle",
      "color-accent",
      "color-accent-hover",
      "color-accent-active",
      "color-accent-subtle",
      "color-accent-ring",
    ],
  },
  {
    title: "Surface",
    note: "Backgrounds. `inverse` is the navy used by header, footer and closers.",
    tokens: [
      "color-surface",
      "color-surface-raised",
      "color-surface-sunken",
      "color-surface-inverse",
      "color-surface-accent",
    ],
  },
  {
    title: "Text",
    tokens: [
      "color-text",
      "color-text-muted",
      "color-text-subtle",
      "color-text-inverse",
      "color-text-accent",
      "color-text-on-accent",
    ],
  },
  {
    title: "Border",
    tokens: ["color-border", "color-border-strong", "color-border-accent", "color-border-inverse"],
  },
  {
    title: "State",
    note: "Mapped onto existing palette values only — no new colours were invented.",
    tokens: ["color-state-error", "color-state-success", "color-state-warning", "color-state-info"],
  },
];

/** The raw palette the semantic layer points at. Shown so the indirection is
 *  visible: these are what Phase 3 replaces. */
export const PRIMITIVE_TOKENS: string[] = [
  "navy",
  "navy-95",
  "navy-85",
  "navy-30",
  "navy-15",
  "navy-08",
  "amber",
  "amber-110",
  "amber-120",
  "amber-30",
  "amber-10",
  "teal",
  "teal-110",
  "teal-30",
  "sage",
  "sage-110",
  "sage-50",
  "stone",
  "cloud-white",
  "white",
  "error",
];

export const TYPE_SCALE = [
  { token: "text-hero", label: "Hero", family: "serif" },
  { token: "text-h1", label: "H1", family: "serif" },
  { token: "text-h2", label: "H2", family: "serif" },
  { token: "text-h3", label: "H3", family: "serif" },
  { token: "text-h4", label: "H4", family: "sans" },
  { token: "text-body", label: "Body", family: "sans" },
  { token: "text-small", label: "Small", family: "sans" },
  { token: "text-label", label: "Label", family: "sans" },
  { token: "text-micro", label: "Micro", family: "sans" },
] as const;

export const SPACE_TOKENS = [
  "space-1",
  "space-2",
  "space-3",
  "space-4",
  "space-5",
  "space-6",
  "space-8",
  "space-10",
  "space-12",
  "space-16",
  "space-20",
  "space-24",
];

export const RADIUS_TOKENS = ["radius-sm", "radius-md", "radius-lg", "radius-xl", "radius-pill"];

export const ELEVATION_TOKENS = [
  "elevation-raised",
  "elevation-card",
  "elevation-overlay",
  "elevation-accent",
];

export const MOTION_TOKENS = [
  "duration-fast",
  "duration-base",
  "duration-slow",
  "easing-out",
  "easing-in-out",
];
