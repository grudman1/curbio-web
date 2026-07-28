// ─────────────────────────────────────────────────────────────────────────────
// THE MARKET LIST
//
// Adding a market is A ROW BELOW. Not a page, not a nav entry, not a sitemap
// entry, not a redirect — those all derive from this array.
//
// This exists because the WordPress site grew three incompatible slug
// conventions by hand (/markets/dmv-maryland/, /markets/wdc/,
// /markets/dallas-ft-worth/), plus /markets/baltimore/ 404ing after a rename
// and /markets/riverside/ 301ing to nothing. Every one of those was a market
// added as code rather than as data. The rule that prevents a repeat:
//
//   NO PER-MARKET SPECIAL CASES ANYWHERE. If something is true of one market
//   and not another, it is a FIELD, not a branch. Any `if (slug === "…")` in
//   this codebase is a bug against this file.
//
// Only the seven live markets are listed. We do not know the next ones, so
// nothing here is speculative. Fields we don't have real data for are left
// EMPTY — an empty array is honest, a plausible-looking guess is not.
// ─────────────────────────────────────────────────────────────────────────────

export type Hsm = {
  /** Full name as displayed. */
  name: string;
  /** E.164 or formatted — whatever the operator API returns. */
  phone: string;
  /** Path under /public, or null when no portrait exists. */
  photo: string | null;
};

export type Market = {
  /**
   * URL segment. The ONLY slug, and it is MARKETING's name for the market —
   * never the operator API's. Those diverge (the API says "NOVA" and "DC";
   * marketing says Northern Virginia and Washington, DC), and letting a third
   * party's internal naming decide curbio.com's URLs is how /markets/wdc/
   * happened. Old spellings go in `legacySlugs`.
   */
  slug: string;
  /** Human label used in nav, headings, and the market picker. */
  displayName: string;
  /** Two-letter state/territory code. */
  state: string;
  /**
   * This market's slug in the CAMPAIGN catalog (lib/markets.ts), which is
   * keyed off the operator API's `marketName`. Present so the two surfaces can
   * be mapped without either dictating the other's naming — the site list owns
   * public URLs, the campaign catalog owns the API contract, and
   * config/markets.guard.ts asserts the mapping stays total.
   */
  campaignSlug: string;
  /**
   * Serviced ZIPs.
   *
   * INCOMPLETE — currently holds only the representative ZIP used for operator
   * API lookups, which is the sole ZIP data that actually exists today. Do NOT
   * use this for coverage checks or "do you serve my ZIP" logic until it is
   * populated properly; it will silently answer "no" for real coverage.
   */
  zips: string[];
  /**
   * Home Services Manager. `null` for every market on purpose: HSM identity is
   * resolved LIVE from the operator API (lib/operator.ts) per request, because
   * it changes with staffing and business hours. This field exists so a market
   * CAN carry a static override if the API ever lacks one — it is not a cache.
   */
  hsm: Hsm | null;
  /** Approximate market centre, used for nearest-market geo resolution. */
  coordinates: { lat: number; lng: number };
  /**
   * Brokerage partner logos shown on the market page.
   * Empty for every market — we have no logo assets and no permission record.
   * Populate with paths under /public/partners once both exist.
   */
  brokerageLogos: { name: string; src: string }[];
  /**
   * Slugs this market has been published under before. Drives the 301 set at
   * cutover so no existing inbound link or index entry breaks. Append here
   * when a slug changes; never rename `slug` without adding the old value.
   */
  legacySlugs: string[];
};

export const MARKETS: Market[] = [
  {
    slug: "atlanta",
    displayName: "Atlanta",
    state: "GA",
    campaignSlug: "atlanta",
    zips: ["30002"],
    hsm: null,
    coordinates: { lat: 33.749, lng: -84.388 },
    brokerageLogos: [],
    legacySlugs: [],
  },
  {
    // Deliberately renamed AWAY from Baltimore to reflect broader coverage;
    // the live page is titled "Maryland Suburbs". The operator API still calls
    // this market "Maryland" and the campaign catalog still slugs it
    // "baltimore" — neither gets to decide the public URL.
    slug: "maryland",
    displayName: "Maryland Suburbs",
    state: "MD",
    campaignSlug: "baltimore",
    zips: ["21201"],
    hsm: null,
    coordinates: { lat: 39.13, lng: -76.85 },
    brokerageLogos: [],
    legacySlugs: ["dmv-maryland", "baltimore", "maryland-suburbs"],
  },
  {
    slug: "dallas",
    displayName: "Dallas",
    state: "TX",
    campaignSlug: "dallas",
    zips: ["75201"],
    hsm: null,
    coordinates: { lat: 32.7767, lng: -96.797 },
    brokerageLogos: [],
    legacySlugs: ["dallas-ft-worth"],
  },
  {
    slug: "los-angeles",
    displayName: "Los Angeles",
    state: "CA",
    campaignSlug: "los-angeles",
    zips: ["90001"],
    hsm: null,
    coordinates: { lat: 34.0522, lng: -118.2437 },
    brokerageLogos: [],
    legacySlugs: ["la", "los-angeles-ca"],
  },
  {
    slug: "riverside",
    displayName: "Riverside",
    state: "CA",
    campaignSlug: "riverside",
    zips: ["92503"],
    hsm: null,
    coordinates: { lat: 33.9533, lng: -117.3962 },
    brokerageLogos: [],
    legacySlugs: [],
  },
  {
    slug: "northern-virginia",
    displayName: "Northern Virginia",
    state: "VA",
    campaignSlug: "northern-virginia",
    zips: ["22030"],
    hsm: null,
    coordinates: { lat: 38.8462, lng: -77.3064 },
    brokerageLogos: [],
    legacySlugs: ["nova"],
  },
  {
    slug: "washington-dc",
    displayName: "Washington, DC",
    state: "DC",
    campaignSlug: "washington-dc",
    zips: ["20001"],
    hsm: null,
    coordinates: { lat: 38.9072, lng: -77.0369 },
    brokerageLogos: [],
    legacySlugs: ["wdc"],
  },
];

export const MARKET_BY_SLUG: Record<string, Market> = Object.fromEntries(
  MARKETS.map((m) => [m.slug, m])
);

/** Every legacy slug → its current slug. Drives the market 301s at cutover. */
export const LEGACY_SLUG_REDIRECTS: Record<string, string> = Object.fromEntries(
  MARKETS.flatMap((m) => m.legacySlugs.map((old) => [old, m.slug]))
);

/** Public path for a market page. One definition — nav, sitemap, and the page
 *  route all call this, so the URL shape can never disagree with itself. */
export function marketPath(slug: string): string {
  return `/markets/${slug}`;
}

export function resolveMarketSlug(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  const resolved = LEGACY_SLUG_REDIRECTS[s] ?? s;
  return MARKET_BY_SLUG[resolved] ? resolved : null;
}
