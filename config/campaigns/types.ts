// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN PAGE CONFIG
//
// A campaign page is DATA. Adding one is a file in this directory plus a line
// in index.ts — no page code, no component, no route.
//
// What a config can change: copy, CTA text, which sections render, whether the
// market picker shows, the sticky bar, partner co-branding, and campaign
// attribution.
//
// What a config CANNOT change, by construction — none of it appears below, so
// no config file can reach it: the form and its fields, validation, the
// /api/lead payload contract, attribution capture, the /confirm handoff,
// market resolution, consent gating, indexability, or the event set. Those are
// the spine every campaign page shares, and a page that could vary them would
// be a page that could silently break lead capture.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * KNOWN referral sources. This is a RECOGNITION list, not a filter.
 *
 * Referral source is the worst data field we have — 20+ hand-typed variants
 * across the CRM, this app, curbio.com, AtlantaLP and KWOfferings, with ~72% of
 * leads carrying nothing usable. Typing it here stops NEW pages minting new
 * variants on their way past.
 *
 * It does NOT gate what a lead may carry. The ~40 partner vanity redirects on
 * go.curbio.com pass hand-written values today —
 * `?referral_source_id=Keller Williams Realty Boston Northwest` — and
 * validating those against this list would silently strip attribution from
 * every live partner link. That is the honeypot failure mode pointed at
 * attribution instead of leads: a filter discarding real data because it does
 * not recognise it.
 *
 * The rule is KEEP AND TAG, never drop. /api/lead passes every value through
 * untouched and records whether it matched this list, so what is actually
 * arriving is visible before anything gets closed. Captured and inferred
 * attribution stay distinguishable rather than being silently averaged.
 *
 * Casing and spacing are load-bearing — historical eXp leads carry
 * "eXp realty" verbatim and must never be normalised.
 */
export const REFERRAL_SOURCE_IDS = [
  "landing page", // default for owned campaign pages
  "eXp realty", // partner: eXp. Casing verbatim — do not tidy.
  "Staging Design DC", // partner: staging + event rentals vendor, DMV.
] as const;

/** Values a CONFIG may set. Inbound URL params are deliberately not limited to
 *  this — see the note above. */
export type ReferralSourceId = (typeof REFERRAL_SOURCE_IDS)[number];

/** Did this value match the known list? Recorded on every lead; never used to
 *  reject one. */
export function isKnownReferralSource(value: string | null | undefined): boolean {
  return !!value && (REFERRAL_SOURCE_IDS as readonly string[]).includes(value);
}

export type RichLine = string;

export type CampaignPage = {
  /** URL segment. The page lives at /lp/<slug>. */
  slug: string;

  /**
   * Page title/description. OPTIONAL: omit to inherit the root layout's, which
   * is what /lp/sell does and why its output is unchanged. New pages should
   * set both.
   */
  meta?: {
    title: string;
    description: string;
  };

  hero: {
    /**
     * Small caps line above the headline. Two variants because the neutral
     * state (visitor's market not yet known) is different COPY, not just a
     * different market name. Ignored entirely on partner pages, where the
     * co-brand lockup takes this slot.
     */
    eyebrow: { default: RichLine; neutral: RichLine };
    /** The h1. Inline markup — see RichLine. */
    headline: RichLine;
    /** Paragraph under the amber rule. */
    sub: RichLine;
    /** Trust row items. Icons are fixed per position by design. */
    trust: [string, string, string];
    /**
     * Optional "or call us" line under the trust row, rendered as a real
     * `tel:` link.
     *
     * A field rather than copy because campaign copy cannot contain links —
     * RichText renders `*emphasis*` and `\n`, nothing else, on purpose. A
     * phone number written into `sub` would be dead text, and a homeowner on
     * a phone would have to retype it. Pages that want a callable number get
     * one; pages that omit this render nothing, as before.
     */
    phone?: { display: string; tel: string };
  };

  /** Overrides the cta-copy A/B variant. Omit to keep the running experiment. */
  cta?: string;

  sections: {
    /** Sold-proof strip. Hidden automatically when no market is resolved. */
    soldProof: boolean;
    /** `{market}` interpolates. Omit for the shared default. */
    soldByLine?: RichLine;
    howItWorks: boolean;
    /** Closer headline. Inline markup. `false` hides the section. */
    closer: RichLine | false;
  };

  /**
   * How this page gets its market.
   *
   *   picker  the visitor's market is resolved client-side (?market=, ?zip=,
   *           IP geo) and the header shows the picker. Per-market variants are
   *           prerendered for every market.
   *   fixed   one market, named here. No picker, no resolution, no per-market
   *           variants — and the page renders SERVER-side, so it is fully
   *           static with real content rather than a skeleton.
   *   none    NO market at all. Not "several markets" — the page never
   *           resolves one, shows no picker, and sends `market: null` on the
   *           lead. For pages that collect a ZIP in the form and let the CRM
   *           parse it to a market on its side, which is what curbio.com does
   *           today. The sold-proof strip hides itself (it is gated on the
   *           market having listings, and the neutral market has none), so a
   *           `none` page must not rely on it.
   *
   * Modelled as a union so "no picker" cannot be expressed without saying which
   * market. The first draft had a boolean, and a page with `false` rendered the
   * neutral state forever — a landing page with no market and no form.
   */
  market: { mode: "picker" } | { mode: "fixed"; slug: string } | { mode: "none" };

  /**
   * Show a ZIP field in the form. Pair with `market: { mode: "none" }`: the
   * visitor types a ZIP, the CRM parses it to a market. The field itself,
   * its validation, and the payload contract are unchanged — this only
   * decides whether it renders.
   */
  showZip?: boolean;

  /**
   * Label for that ZIP field. Copy, like every other string here — the
   * default is agent-facing ("Property or Agent ZIP Code") and reads wrong on
   * a consumer page. Defaults to the existing string so pages that don't set
   * it are unchanged.
   */
  zipLabel?: string;

  /**
   * Email field placeholder. Copy, same reasoning as `zipLabel` — the default
   * "you@brokerage.com" is agent-facing and reads wrong to a homeowner.
   * Defaults to the existing string so pages that don't set it are unchanged.
   */
  emailPlaceholder?: string;

  /**
   * Mobile sticky CTA bar. DEFAULT OFF on purpose: it is conversion-affecting,
   * so it stays available but unproven until a page that isn't already earning
   * has tested it.
   */
  stickyBar?: boolean;

  attribution: {
    /**
     * Lead payload `source`. Free-form — it is ours and it is new.
     *
     * `{marketSlug}` interpolates the market SLUG here, not the display name:
     * this value is an identifier consumed by reporting, and slugs are stable
     * where display names are marketing copy that can be reworded. (Copy fields
     * use `{market}` for the display name — different token, different job.)
     *
     * Include the token for one value per market; omit it to have several pages
     * report the SAME source when they are one campaign.
     */
    source: string;
    /** Closed list. Defaults to "landing page". */
    referralSourceId?: ReferralSourceId;
    /**
     * FALLBACK utm_source for this page — a default, never an override.
     *
     * Channel is derived from utm_source at request time (lib/channels.ts),
     * so a page whose visitors all arrive through one partner would otherwise
     * report `direct` for anyone whose link lost its UTMs. This fills the gap
     * ONLY when the visitor carries no utm_source of their own.
     *
     * Must be a value in VALID_CHANNELS — anything else derives to `direct`,
     * which is the silent failure this exists to prevent.
     *
     * Applied at SEND TIME in FormCard and never persisted. See the comment
     * there for why that distinction is load-bearing.
     */
    defaultUtmSource?: string;
  };

  /** Partner id from lib/partners.ts. Adds co-branding. Omit for owned pages. */
  partner?: string;
};
