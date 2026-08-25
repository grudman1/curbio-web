import { SERVICES, type Service } from "./services";

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE PICKER RANGES — the /how-it-works "ballpark it" estimator.
//
// ⚠️  NEEDS FACT — EVERY NUMBER BELOW IS A PLACEHOLDER. ⚠️
//
// These ranges came from the design mockup, not from Curbio project data. They
// are published PRICING, which is a different class of claim from marketing
// copy: an agent who reads "$8,000 – $20,000" and repeats it to a seller has
// been given a number by us. Nothing here has been checked against a single
// closed project.
//
// The page they feed is `indexed: false` and unlinked, so the exposure today
// is internal only — but this file must be replaced with real percentiles from
// the project history before /how-it-works is linked or indexed. Until then
// PUBLISHABLE stays false and the section renders its own "illustrative only"
// state rather than quietly presenting placeholders as guidance.
//
// What real numbers would look like: p25/p75 of completed scope cost per
// service line, last 12 months, ideally per market. `weeksOnSite` likewise —
// median crew days, not a guess.
//
// Names are NOT duplicated here. They are keyed to config/services.ts by slug,
// so a service renamed there renames itself in the picker.
// ─────────────────────────────────────────────────────────────────────────────

/** Flip ONLY when the numbers below are sourced. Gates the picker's copy. */
export const RANGES_ARE_SOURCED = false;

export type ScopeRange = {
  /** Slug from config/services.ts — the name comes from there. */
  slug: string;
  /** PLACEHOLDER. Low end of a typical scope, whole dollars. */
  lo: number;
  /** PLACEHOLDER. High end of a typical scope, whole dollars. */
  hi: number;
  /** PLACEHOLDER. Rough crew weeks on site for this line alone. */
  weeksOnSite: number;
};

export const SCOPE_RANGES: ScopeRange[] = [
  { slug: "interior-exterior-painting", lo: 3500, hi: 7000, weeksOnSite: 1 },
  { slug: "flooring", lo: 4000, hi: 12000, weeksOnSite: 2 },
  { slug: "kitchen-updates", lo: 8000, hi: 20000, weeksOnSite: 3 },
  { slug: "bathroom-updates", lo: 6000, hi: 15000, weeksOnSite: 2 },
  { slug: "curb-appeal-landscaping", lo: 2500, hi: 8000, weeksOnSite: 1 },
  { slug: "roofing-exterior-repair", lo: 9000, hi: 20000, weeksOnSite: 1 },
  { slug: "hvac-plumbing", lo: 1500, hi: 6000, weeksOnSite: 1 },
  { slug: "staging", lo: 2000, hi: 5000, weeksOnSite: 1 },
];

export type ScopeOption = ScopeRange & { service: Service };

/** Ranges joined to their service. Drops any slug that no longer exists rather
 *  than rendering a chip with no name — a rename in services.ts surfaces here
 *  as a missing chip, not as a crash. */
export const SCOPE_OPTIONS: ScopeOption[] = SCOPE_RANGES.map((r) => {
  const service = SERVICES.find((s) => s.slug === r.slug);
  return service ? { ...r, service } : null;
}).filter((o): o is ScopeOption => o !== null);
