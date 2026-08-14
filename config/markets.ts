// ─────────────────────────────────────────────────────────────────────────────
// THE MARKET LIST — the only place in this codebase a market is named.
//
// Adding a market is A ROW BELOW. Nothing else. The market page, nav entry,
// footer column, sitemap URL, picker card, campaign sold-proof strip, operator
// API lookup, CRM payload and legacy 301s all derive from this array.
//
// ── Why five name fields and not one ─────────────────────────────────────────
//
// One string doing five jobs is what produced the mess this replaces. Six
// separate lists had drifted, and the Maryland market alone carried SEVEN
// spellings: `Maryland` (operator API), `baltimore` (two local lists),
// `Baltimore` (CRM map), `maryland-suburbs` (an untracked markets.json),
// `dmv-maryland` (live WordPress URL), and a `/markets/baltimore/` URL that
// 404s while 19 internal links still point at it.
//
// Three systems name markets, and only ONE of them is authoritative for the
// public slug:
//
//   slug + displayName + coverage   sell.curbio.com's market modal. Marketing
//                                   chose these deliberately; they are live and
//                                   converting. THE source of truth for public
//                                   naming. Verbatim, do not "tidy".
//   operatorName                    app.curbio.com's internal ZIP→HSM lookup
//                                   key. Never a public slug — it is why
//                                   /markets/wdc/ exists.
//   crmName                         what the CRM expects in the lead payload.
//
// WordPress /markets/ slugs are LEGACY URLS, not naming input. They live in
// `legacySlugs` and 301 away.
//
// ── The rule ────────────────────────────────────────────────────────────────
//
// NO PER-MARKET SPECIAL CASES ANYWHERE. If something is true of one market and
// not another, it is a FIELD here, not a branch there. Any `if (slug === "…")`
// in this codebase is a bug against this file.
//
// Array ORDER is the market-picker display order, interleaved so one HSM's
// markets aren't clustered side by side.
// ─────────────────────────────────────────────────────────────────────────────

/** A sold listing shown in the campaign sold-proof strip. */
export type SoldListing = {
  neighborhood: string;
  /** Omit where no verified sale price exists. NEVER invent prices. */
  price?: string;
  /** Price is a Zestimate, not a confirmed sale. */
  unverified?: boolean;
  /** /sold/*.jpg — undefined shows a striped placeholder. */
  photo?: string;
};

export type Market = {
  /** Public URL segment. Marketing's name. Old spellings go in legacySlugs. */
  slug: string;
  /**
   * SHORT marketing label — "Atlanta", "Washington, DC". This is the string
   * that appears in campaign copy, headings and the lead payload's market
   * field. Distinct from displayName on purpose; both are live text.
   */
  name: string;
  /** Human label — "Atlanta, GA". Carries the state, so don't append it again. */
  displayName: string;
  /** Service-area line under the market name — "Metro Atlanta · North GA". */
  coverage: string;
  /** EXACT `marketName` string the operator API returns. Internal, never public. */
  operatorName: string;
  /** EXACT market string the CRM expects in the lead payload. */
  crmName: string;
  /**
   * Market codes app.curbio.com uses in its exports/reports ("ATL", "BAL"…).
   * A list because the app splits some metros we treat as one market
   * (Maryland is BAL + NMD + SMD there). App codes with no row here (SEA,
   * SD) are markets we don't serve landing pages for — reporting aggregates
   * them under "Other markets"; they NEVER become market rows just to make
   * a report add up.
   */
  appMarketCodes: string[];
  /** Two-letter state code, used for same-state geo disambiguation. */
  state: string;
  /** Representative ZIP used for operator API lookups. */
  canonicalZip: string;
  /** Approximate metro centroid for nearest-market geo fallback. */
  coordinates: { lat: number; lng: number };
  /** Representative cities, for copy. */
  cities: string[];
  /**
   * Static HSM assignment for the market picker, so cards render without an
   * API call each. The AUTHORITATIVE HSM identity (name, phone, Calendly,
   * business hours) still comes live from the operator API per request — this
   * is a display convenience, not a cache.
   */
  hsm: { name: string; photo: string | null };
  /** Brokerage partner logos. Empty everywhere — no assets, no permissions. */
  brokerageLogos: { name: string; src: string }[];
  /**
   * Every slug this market has been published under. Drives the 301s.
   * Append when a slug changes; never rename `slug` without adding the old one.
   */
  legacySlugs: string[];
  /** Campaign sold-proof listings. */
  sold: SoldListing[];
};

export const MARKETS: Market[] = [
  {
    slug: "atlanta",
    name: "Atlanta",
    displayName: "Atlanta, GA",
    coverage: "Metro Atlanta · North GA",
    operatorName: "Atlanta",
    crmName: "Atlanta",
    appMarketCodes: ["ATL"],
    state: "GA",
    canonicalZip: "30002",
    coordinates: { lat: 33.749, lng: -84.388 },
    cities: ["Atlanta", "Marietta", "Alpharetta", "Decatur", "Sandy Springs"],
    hsm: { name: "Christine Harvey", photo: "/hsm/christine-harvey.jpg" },
    brokerageLogos: [],
    legacySlugs: [],
    sold: [
      { neighborhood: "Intown Atlanta", price: "$665,000", photo: "/sold/atlanta/959Berne_Intown.jpeg" },
      { neighborhood: "Marietta", price: "$365,000", photo: "/sold/atlanta/680Smithstone_Marietta.webp" },
      { neighborhood: "Roswell", price: "$785,000", photo: "/sold/atlanta/905Windsor_Roswell.webp" },
      { neighborhood: "Acworth", price: "$497,000", photo: "/sold/atlanta/5076OakBranch_Acworth.webp" },
      { neighborhood: "Lawrenceville", price: "$354,000", photo: "/sold/atlanta/772Bostonian_Lawrenceville.webp" },
    ],
  },
  {
    slug: "washington-dc",
    name: "Washington, DC",
    displayName: "Washington, DC",
    coverage: "All DC Areas",
    operatorName: "DC",
    crmName: "DC",
    appMarketCodes: ["DC"],
    state: "DC",
    canonicalZip: "20001",
    coordinates: { lat: 38.9072, lng: -77.0369 },
    cities: ["Washington", "Georgetown", "Capitol Hill", "Navy Yard"],
    hsm: { name: "Joshua Collins", photo: "/hsm/joshua-collins.jpg" },
    brokerageLogos: [],
    legacySlugs: ["wdc"],
    sold: [
      { neighborhood: "Bellevue",    price: "$430,000",   photo: "/sold/washington-dc/303AtlanticStreet_Bellevue.jpg" },
      { neighborhood: "Park View",   price: "$785,000",   photo: "/sold/washington-dc/639NWColumbia_Park View.avif" },
      { neighborhood: "Woodridge",   price: "$852,000",   photo: "/sold/washington-dc/300920thSt_Woodridge.jpg" },
      { neighborhood: "Chevy Chase", price: "$1,480,000", photo: "/sold/washington-dc/543132ndStreet_ChevyChase.webp" },
      { neighborhood: "Capitol Hill", price: "$996,500",  photo: "/sold/washington-dc/1217DStreetNE_CapitolHill.jpeg" },
    ],
  },
  {
    slug: "dallas",
    name: "Dallas",
    displayName: "Dallas, TX",
    coverage: "DFW Metroplex",
    operatorName: "Dallas",
    crmName: "Dallas",
    appMarketCodes: ["DAL"],
    state: "TX",
    canonicalZip: "75201",
    coordinates: { lat: 32.7767, lng: -96.797 },
    cities: ["Dallas", "Plano", "Frisco", "Arlington", "Fort Worth"],
    hsm: { name: "Miguel Picart", photo: "/hsm/miguel-picart.jpg" },
    brokerageLogos: [],
    legacySlugs: ["dallas-ft-worth"],
    sold: [
      { neighborhood: "Dallas",         price: "$875,000",   photo: "/sold/dallas/221SEdgefield_Dallas.webp" },
      { neighborhood: "Plano",          price: "$592,000",   photo: "/sold/dallas/2913TrophyDrive_Plano.jpeg" },
      { neighborhood: "Frisco",         price: "$880,000",   photo: "/sold/dallas/4613ShadowRidge_Frisco.webp" },
      { neighborhood: "McKinney",       price: "$1,199,900", photo: "/sold/dallas/6558SparrowPoint_McKinney.webp" },
      { neighborhood: "Lake Highlands", price: "$325,000",   photo: "/sold/dallas/11111QuailRunSt_LakeHighlands.webp" },
    ],
  },
  {
    slug: "maryland",
    name: "Maryland",
    displayName: "Maryland, MD",
    coverage: "Baltimore · Maryland Suburbs",
    operatorName: "Maryland",
    crmName: "Maryland",
    appMarketCodes: ["BAL", "NMD", "SMD"],
    state: "MD",
    canonicalZip: "21201",
    coordinates: { lat: 39.13, lng: -76.85 },
    cities: ["Baltimore", "Bethesda", "Rockville", "Silver Spring", "Columbia"],
    // Lisa Tucker left Curbio (2026-07-30); Joshua Collins covers Maryland in
    // the interim, alongside DC and NOVA. Matches the operator API, which
    // already routes every Maryland ZIP to him.
    hsm: { name: "Joshua Collins", photo: "/hsm/joshua-collins.jpg" },
    brokerageLogos: [],
    legacySlugs: ["dmv-maryland", "baltimore", "maryland-suburbs"],
    sold: [
      { neighborhood: "Bethesda",      price: "$1,075,000", photo: "/sold/baltimore/9213Cedarcrest_Bethesda.jpg" },
      { neighborhood: "Silver Spring", price: "$640,000",   photo: "/sold/baltimore/13607Wendover_SilverSpring.webp" },
      { neighborhood: "Pikesville",    price: "$449,000",   photo: "/sold/baltimore/8216McDonogh_Pikesville.webp" },
      { neighborhood: "Potomac",       price: "$1,610,000", photo: "/sold/baltimore/8250Buckspark_Potomac.jpg" },
      { neighborhood: "Ellicott City", price: "$1,100,000", photo: "/sold/baltimore/13339Ridgewood_EllicotCity.webp" },
    ],
  },
  {
    slug: "los-angeles",
    name: "Los Angeles",
    displayName: "Los Angeles, CA",
    coverage: "Greater Los Angeles",
    operatorName: "Los Angeles",
    crmName: "Los Angeles",
    appMarketCodes: ["LA"],
    state: "CA",
    canonicalZip: "90001",
    coordinates: { lat: 34.0522, lng: -118.2437 },
    cities: ["Los Angeles", "Long Beach", "Pasadena", "Glendale", "Santa Monica"],
    hsm: { name: "Trevor Laramee", photo: "/hsm/trevor-laramee.jpg" },
    brokerageLogos: [],
    legacySlugs: ["la", "los-angeles-ca"],
    sold: [
      { neighborhood: "Hollywood Hills",  price: "$2,825,000", photo: "/sold/los-angeles/2276LaGranada_HollywoodHills.jpg" },
      { neighborhood: "Laguna Niguel",    price: "$5,020,000", photo: "/sold/los-angeles/6Riverstone_Pasadena.webp" },
      { neighborhood: "South OC",         price: "$1,159,000", photo: "/sold/los-angeles/7MonticelloLn_SouthOC.webp" },
      { neighborhood: "Pasadena",         price: "$2,695,000", photo: "/sold/los-angeles/541MartosDr_Pasadena.jpg" },
      { neighborhood: "Hermosa Beach",    price: "$2,350,000", photo: "/sold/los-angeles/1256OwossoAve_HermosaBeach.webp" },
    ],
  },
  {
    slug: "northern-virginia",
    name: "Northern Virginia",
    displayName: "Northern Virginia, VA",
    coverage: "Arlington · Manassas",
    operatorName: "NOVA",
    crmName: "NOVA",
    appMarketCodes: ["NVA"],
    state: "VA",
    canonicalZip: "22030",
    coordinates: { lat: 38.8462, lng: -77.3064 },
    cities: ["Arlington", "Alexandria", "Fairfax", "Reston", "Vienna"],
    hsm: { name: "Joshua Collins", photo: "/hsm/joshua-collins.jpg" },
    brokerageLogos: [],
    legacySlugs: ["nova"],
    sold: [
      { neighborhood: "Woodbridge",    price: "$525,000",   photo: "/sold/northern-virginia/1257EverettAve_Woodbridge.jpg" },
      { neighborhood: "Fairfax",       price: "$931,444",   photo: "/sold/northern-virginia/5398QuincyMarr_Fairfax.jpg" },
      { neighborhood: "Great Falls",   price: "$1,800,000", photo: "/sold/northern-virginia/9420BianJac_GreatFalls.jpg" },
      { neighborhood: "Fredericksburg", price: "$582,000",  photo: "/sold/northern-virginia/12305GladeDr_Fredericksburg.webp" },
      { neighborhood: "Leesburg",      price: "$1,225,000", photo: "/sold/northern-virginia/43170ParkersRidge_Leesburg.webp" },
    ],
  },
  {
    slug: "riverside",
    name: "Riverside",
    displayName: "Riverside, CA",
    coverage: "Inland Empire · Riverside",
    operatorName: "Riverside",
    crmName: "Riverside",
    appMarketCodes: ["RS"],
    state: "CA",
    canonicalZip: "92503",
    coordinates: { lat: 33.9533, lng: -117.3962 },
    cities: ["Riverside", "Corona", "Moreno Valley", "Temecula"],
    hsm: { name: "Trevor Laramee", photo: "/hsm/trevor-laramee.jpg" },
    brokerageLogos: [],
    legacySlugs: [],
    sold: [
      { neighborhood: "Rancho Mirage",   price: "$549,000", photo: "/sold/riverside/24KevinLeeLane_RanchMirage.jpg" },
      { neighborhood: "Riverside",       price: "$565,000", photo: "/sold/riverside/4064ViaSanJose_Riverside.webp" },
      { neighborhood: "Cucamonga",       price: "$950,000", photo: "/sold/riverside/5785Campanella_Cucamonga.webp" },
      { neighborhood: "Canyon Lake",     price: "$615,000", photo: "/sold/riverside/30287Skipjack_CanyonLake.jpg" },
      { neighborhood: "Temecula",        price: "$924,000", photo: "/sold/riverside/32049CorteCanel_Temecula.webp" },
    ],
  },
];

export const MARKET_BY_SLUG: Record<string, Market> = Object.fromEntries(
  MARKETS.map((m) => [m.slug, m])
);

/** Operator API `marketName` → market. The API is keyed by its own names. */
export const MARKET_BY_OPERATOR_NAME: Record<string, Market> = Object.fromEntries(
  MARKETS.map((m) => [m.operatorName, m])
);

/** Every legacy spelling → its current slug. Drives the 301s and ?market= aliases. */
export const LEGACY_SLUG_REDIRECTS: Record<string, string> = Object.fromEntries(
  MARKETS.flatMap((m) => m.legacySlugs.map((old) => [old, m.slug]))
);

/** Public path for a market page. One definition, so nav, sitemap and the route
 *  can never disagree about the URL shape. */
export function marketPath(slug: string): string {
  return `/markets/${slug}`;
}

/** Canonical slug for any input — current slug or legacy spelling. Null if unknown. */
export function resolveMarketSlug(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  const resolved = LEGACY_SLUG_REDIRECTS[s] ?? s;
  return MARKET_BY_SLUG[resolved] ? resolved : null;
}

/** CRM market string for a slug (or legacy spelling). Null when unrecognised —
 *  callers must NOT invent one; the CRM rejects unknown markets. */
export function crmNameForSlug(input: string | null | undefined): string | null {
  const slug = resolveMarketSlug(input);
  return slug ? MARKET_BY_SLUG[slug].crmName : null;
}
