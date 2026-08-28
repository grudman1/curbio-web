// ─────────────────────────────────────────────────────────────────────────────
// The Forms registry — one row per FORM_TYPE (config/marketingHub.ts), the
// closed list every Engaged conversion is counted against. Mirrors
// config/pageRegistry.ts's role for Pages: named rows, not invented ones, so
// the Forms screen has a real registry instead of a bare stat grid.
//
// Three of the eight promise something back — the asset-delivery events
// HUB_SURFACES.forms.needs already names: toolkit send, webinar link, coupon.
// The rest are one-way submissions. No submission counts, delivery status, or
// last-submission dates exist here — /api/intake isn't wired yet (forms.needs
// says so), so those stay honest em-dashes on every card until it is.
// ─────────────────────────────────────────────────────────────────────────────

import { FORM_TYPES, type FormType } from "./marketingHub";

export type FormRegistryEntry = {
  slug: FormType;
  label: string;
  deliversAsset: boolean;
};

const LABELS: Record<FormType, string> = {
  toolkit: "Toolkit download",
  webinar: "Webinar signup",
  coupon_claim: "Coupon claim",
  newsletter: "Newsletter signup",
  partner_inquiry: "Partner inquiry",
  event_rsvp: "Event RSVP",
  personal_analysis: "Personal analysis request",
  other: "Other",
};

const DELIVERS_ASSET: ReadonlySet<FormType> = new Set(["toolkit", "webinar", "coupon_claim"]);

export const FORM_REGISTRY: FormRegistryEntry[] = FORM_TYPES.map((slug) => ({
  slug,
  label: LABELS[slug],
  deliversAsset: DELIVERS_ASSET.has(slug),
}));

export const FORM_REGISTRY_BY_SLUG: Record<string, FormRegistryEntry> = Object.fromEntries(
  FORM_REGISTRY.map((f) => [f.slug, f])
);
