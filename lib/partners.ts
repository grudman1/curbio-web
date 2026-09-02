export type Partner = {
  id: string;
  name: string;
  /** Path to partner logo in /public. Swap the file to update; no code change needed. */
  logoPath: string;
  /** Trusted Provider badge for dark/navy backgrounds (white ink). */
  badgePath: string | null;
  /** Trusted Provider badge for light/white backgrounds (black ink). */
  badgePathDark: string | null;
  /**
   * Partner mark for the HERO co-brand lockup, which sits on a light
   * background — so this is the DARK-ink asset, the opposite of `logoPath`
   * (white knockout, for the navy header).
   *
   * Optional, and only meaningful for a partner with no badge: a partner that
   * has one shows the badge in this slot instead. It exists because a badgeless
   * partner would otherwise appear above the fold as text alone, with their
   * mark visible only in the 24px header — which reads as an afterthought when
   * the whole page is built on their referral.
   *
   * A WORDMARK, not a seal: it renders at a fixed height with width auto, so
   * a wide lockup is not squashed into the badge's square box.
   */
  lockupLogoPath?: string;
  /**
   * Exact referralSourceId string for the CRM. Space and casing are load-bearing
   * (historical eXp leads carry "eXp realty" verbatim — never normalise this value).
   */
  referralSourceId: string;
  /**
   * Co-brand lockup copy. Data, not markup — ~50 partner pages are coming and
   * each needs its own wording. `{market}` interpolates the market name.
   * `neutral` is used before the visitor's market is known.
   */
  coBrand: {
    servingLine: { default: string; neutral: string };
    /** Two-line title beside the badge. `\n` breaks the line. */
    title: string;
    badgeAlt: string;
    logoAlt: string;
  };
};

export const EXP_PARTNER: Partner = {
  id: "exp",
  name: "eXp Realty",
  logoPath: "/partners/exp-solutions-white.svg",
  badgePath: "/partners/exp-badge-trusted-white.png",
  badgePathDark: "/partners/exp-badge-trusted-black.png",
  referralSourceId: "eXp realty",
  coBrand: {
    servingLine: { default: "Serving {market} eXp Realty", neutral: "For eXp Realty agents" },
    title: "A Trusted Provider for\neXp Realty agents",
    badgeAlt: "eXp Solutions Trusted Provider",
    logoAlt: "eXp Solutions",
  },
};

/**
 * Staging Design DC — residential staging and event rentals across DC,
 * Maryland and Virginia. Not a brokerage, and the relationship runs the
 * opposite way to eXp's: CURBIO names THEM a Preferred Vendor and uses them
 * for staging on DMV jobs, while they refer homeowners whose houses need work
 * before they can be staged.
 *
 * `badgePath`/`badgePathDark` are null for exactly that reason. eXp's badge is
 * eXp certifying Curbio; there is no equivalent artefact when the endorsement
 * points the other way. CoBrandMark renders the text lockup alone.
 *
 * The logo is a white knockout because PartnerHeader paints it on the navy
 * bar — their supplied wordmark is dark grey and would be invisible there.
 * Cropped to the wordmark: their strapline sits ~2px tall at the header's
 * 24px logo height and reads as noise.
 */
export const STAGING_DESIGN_DC_PARTNER: Partner = {
  id: "staging-design-dc",
  name: "Staging Design DC",
  logoPath: "/partners/staging-design-dc-white.png",
  badgePath: null,
  badgePathDark: null,
  lockupLogoPath: "/partners/staging-design-dc-dark.png",
  referralSourceId: "Staging Design DC",
  coBrand: {
    // This page resolves no market, so only `neutral` is ever rendered.
    // `default` is kept coherent rather than left as a stub.
    servingLine: {
      default: "Staging by Staging Design DC",
      neutral: "Staging by Staging Design DC",
    },
    title: "A Curbio\nPreferred Vendor",
    badgeAlt: "",
    logoAlt: "Staging Design DC",
  },
};

/** Partner registry, by id. Referenced from a campaign config's `partner`. */
export const PARTNERS: Record<string, Partner> = {
  [EXP_PARTNER.id]: EXP_PARTNER,
  [STAGING_DESIGN_DC_PARTNER.id]: STAGING_DESIGN_DC_PARTNER,
};

// ─────────────────────────────────────────────────────────────────────────────
// Brokerage trust logos — the "brokerages we work with" strip (homepage
// banner, design-preview's brokerage marquee). Distinct from `PARTNERS`
// above: these brokerages don't have a co-branded landing page, referral
// tracking, or a Trusted Provider badge — they're a credibility signal, not
// a partner program. Kept in this file anyway (not a separate hardcoded
// array in the component) because it's still partner-adjacent data and this
// is the one file that owns it — one registry, not two lists to maintain.
//
// Assets: source files supplied by marketing as mixed WebP/JPG at inconsistent
// crops (public/partners/brokerages/ holds the normalized output — see the
// one-time normalization script's output, not checked in). Every logo was:
//   1. alpha-masked to its own ink (white background => transparent, any
//      non-white pixel => opaque, proportional to how far it is from white —
//      captures colored logos, not just black text)
//   2. flattened to a single flat color, --fg-muted (#4A5A75) — an existing
//      design-system token, not a new one — so 19 differently-branded marks
//      (Adams Cameron's gradient globe, Weichert's yellow bar, RE/MAX's
//      blue-and-red) read as one calm row instead of clashing
//   3. trimmed to content (several source files had a lot of dead padding —
//      Adams Cameron, Realty Executives) and resized to a COMMON HEIGHT
//      (not width), so short marks and tall stacked lockups sit evenly on
//      one baseline
//   4. exported at 2x for retina
//
// `logoPathColor` is a second pass through the SAME alpha derivation (step 1
// above) but keeping the source RGB instead of flattening it — same trim,
// same resize, so it's pixel-for-pixel the same silhouette in its original
// brand color. That register match is what lets the marquee crossfade to
// full color on hover without any shift or resize jump.
// ─────────────────────────────────────────────────────────────────────────────

/** The common height every normalized logo is exported at (step 3 above).
 *  Because it is common, a logo's INTRINSIC WIDTH is the only thing that
 *  varies between marks — which makes width the one measurement a consumer
 *  needs to reserve the right box. */
export const BROKERAGE_LOGO_HEIGHT = 80;

export type BrokerageLogo = {
  id: string;
  name: string;
  logoPath: string;
  logoPathColor: string;
  /** Intrinsic width of both PNGs at BROKERAGE_LOGO_HEIGHT. */
  width: number;
  /** width ÷ BROKERAGE_LOGO_HEIGHT. A consumer that paints the logo as a CSS
   *  background rather than an <img> has no intrinsic size to lay out from,
   *  so it needs this to size the box before the file loads — see
   *  components/home/BrokerageMarquee.tsx. */
  aspectRatio: number;
};

/** id, display name, and intrinsic width — both logo paths are derived below
 *  so the two files can never drift apart (e.g. a color asset added without
 *  its mono counterpart). Widths are measured from the normalized PNGs; the
 *  mono and color pass produce identical dimensions by construction (same
 *  trim, same resize), which is what makes one width correct for both. */
const BROKERAGE_NAMES: { id: string; name: string; width: number }[] = [
  { id: "la-rosa", name: "La Rosa Realty", width: 260 },
  { id: "coldwell-banker", name: "Coldwell Banker", width: 112 },
  { id: "lpt-realty", name: "LPT Realty", width: 336 },
  { id: "keller-williams", name: "Keller Williams", width: 175 },
  { id: "perry-miller-streiff", name: "Perry-Miller Streiff", width: 270 },
  { id: "better-homes-gardens", name: "Better Homes & Gardens Real Estate", width: 149 },
  { id: "weichert", name: "Weichert Realtors", width: 306 },
  { id: "realty-executives", name: "Realty Executives", width: 168 },
  { id: "re-max", name: "RE/MAX", width: 438 },
  { id: "simplihom", name: "simpliHOM", width: 383 },
  { id: "engel-volkers", name: "Engel & Völkers", width: 747 },
  { id: "adams-cameron", name: "Adams Cameron & Co. Realtors", width: 104 },
  { id: "long-foster", name: "Long & Foster Real Estate", width: 136 },
  { id: "realty-one-group", name: "Realty ONE Group", width: 308 },
  { id: "atlas-real-estate", name: "Atlas Real Estate", width: 269 },
  { id: "ansley", name: "Ansley Real Estate", width: 277 },
  { id: "samson-properties", name: "Samson Properties", width: 373 },
  { id: "empowerhome", name: "EmpowerHome Team", width: 156 },
  { id: "homesmart", name: "HomeSmart", width: 167 },
];

export const BROKERAGE_LOGOS: BrokerageLogo[] = BROKERAGE_NAMES.map(({ id, name, width }) => ({
  id,
  name,
  width,
  aspectRatio: width / BROKERAGE_LOGO_HEIGHT,
  logoPath: `/partners/brokerages/${id}.png`,
  logoPathColor: `/partners/brokerages/${id}-color.png`,
}));
