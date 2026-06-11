// ─────────────────────────────────────────────────────────────────────────────
// Campaign markets for the email landing page. The header market picker switches
// between these via ?market=<slug>; every market-named string on the page reads
// from here. Atlanta has real, named sold listings. Other markets currently show
// city-level proof WITHOUT prices (placeholder) until real sold data lands —
// see `placeholder: true`. Do not invent prices.
// ─────────────────────────────────────────────────────────────────────────────

export type SoldListing = {
  neighborhood: string;
  price?: string; // omit where no verified sale price exists
  unverified?: boolean; // price is a Zestimate, not a confirmed sale
  photo?: string; // /sold/*.jpg — leave undefined to show striped placeholder
};

export type CampaignMarket = {
  slug: string;
  name: string; // shown in the tag, eyebrows, form payload
  /** true when sold listings lack verified prices (placeholder proof) */
  placeholder?: boolean;
  sold: SoldListing[];
};

export const CAMPAIGN_MARKETS: CampaignMarket[] = [
  {
    slug: "atlanta",
    name: "Atlanta",
    sold: [
      { neighborhood: "Intown Atlanta", price: "$665,000", photo: "/sold/atlanta/959Berne_Intown.jpeg" },
      { neighborhood: "Marietta", price: "$365,000", photo: "/sold/atlanta/680Smithstone_Marietta.webp" },
      { neighborhood: "Roswell", price: "$785,000", photo: "/sold/atlanta/905Windsor_Roswell.webp" },
      { neighborhood: "Acworth", price: "$497,000", photo: "/sold/atlanta/5076OakBranch_Acworth.webp" },
      { neighborhood: "Lawrenceville", price: "$354,000", photo: "/sold/atlanta/772Bostonian_Lawrenceville.webp" },
    ],
  },
  {
    slug: "dallas",
    name: "Dallas",
    sold: [
      { neighborhood: "Dallas",         price: "$875,000",   photo: "/sold/dallas/221SEdgefield_Dallas.webp" },
      { neighborhood: "Plano",          price: "$592,000",   photo: "/sold/dallas/2913TrophyDrive_Plano.jpeg" },
      { neighborhood: "Frisco",         price: "$880,000",   photo: "/sold/dallas/4613ShadowRidge_Frisco.webp" },
      { neighborhood: "McKinney",       price: "$1,199,900", photo: "/sold/dallas/6558SparrowPoint_McKinney.webp" },
      { neighborhood: "Lake Highlands", price: "$325,000",   photo: "/sold/dallas/11111QuailRunSt_LakeHighlands.webp" },
    ],
  },
  {
    slug: "los-angeles",
    name: "Los Angeles",
    sold: [
      { neighborhood: "Hollywood Hills",  price: "$2,825,000", photo: "/sold/los-angeles/2276LaGranada_HollywoodHills.jpg" },
      { neighborhood: "Laguna Niguel",    price: "$5,020,000", photo: "/sold/los-angeles/6Riverstone_Pasadena.webp" },
      { neighborhood: "South OC",         price: "$1,159,000", photo: "/sold/los-angeles/7MonticelloLn_SouthOC.webp" },
      { neighborhood: "Pasadena",         price: "$2,695,000", photo: "/sold/los-angeles/541MartosDr_Pasadena.jpg" },
      { neighborhood: "Hermosa Beach",    price: "$2,350,000", photo: "/sold/los-angeles/1256OwossoAve_HermosaBeach.webp" },
    ],
  },
  {
    slug: "riverside",
    name: "Riverside",
    placeholder: true,
    sold: [
      { neighborhood: "Riverside" },
      { neighborhood: "Corona" },
      { neighborhood: "Moreno Valley" },
      { neighborhood: "Temecula" },
      { neighborhood: "Rancho Cucamonga" },
    ],
  },
  {
    slug: "northern-virginia",
    name: "Northern Virginia",
    sold: [
      { neighborhood: "Woodbridge",    price: "$525,000",   photo: "/sold/northern-virginia/1257EverettAve_Woodbridge.jpg" },
      { neighborhood: "Fairfax",       price: "$931,444",   photo: "/sold/northern-virginia/5398QuincyMarr_Fairfax.jpg" },
      { neighborhood: "Great Falls",   price: "$1,800,000", photo: "/sold/northern-virginia/9420BianJac_GreatFalls.jpg" },
      { neighborhood: "Fredericksburg", price: "$582,000",  photo: "/sold/northern-virginia/12305GladeDr_Fredericksburg.webp" },
      { neighborhood: "Leesburg",      price: "$1,225,000", photo: "/sold/northern-virginia/43170ParkersRidge_Leesburg.webp" },
    ],
  },
  {
    slug: "washington-dc",
    name: "Washington, DC",
    sold: [
      { neighborhood: "Bellevue",    price: "$430,000",   photo: "/sold/washington-dc/303AtlanticStreet_Bellevue.jpg" },
      { neighborhood: "Park View",   price: "$785,000",   photo: "/sold/washington-dc/639NWColumbia_Park View.avif" },
      { neighborhood: "Woodridge",   price: "$852,000",   photo: "/sold/washington-dc/300920thSt_Woodridge.jpg" },
      { neighborhood: "Chevy Chase", price: "$1,480,000", photo: "/sold/washington-dc/543132ndStreet_ChevyChase.webp" },
      { neighborhood: "Capitol Hill", price: "$996,500",  photo: "/sold/washington-dc/1217DStreetNE_CapitolHill.jpeg" },
    ],
  },
  {
    slug: "southern-maryland",
    name: "Southern Maryland",
    placeholder: true,
    sold: [
      { neighborhood: "Waldorf" },
      { neighborhood: "Clinton" },
      { neighborhood: "Upper Marlboro" },
      { neighborhood: "La Plata" },
      { neighborhood: "Bowie" },
    ],
  },
  {
    // The market is BALTIMORE. "Maryland Suburbs" is only the secondary label
    // on the Baltimore picker card (region in lib/markets.ts) — never a slug,
    // market, or folder name.
    slug: "baltimore",
    name: "Baltimore",
    // No placeholder: true — all five listings have verified sale prices.
    sold: [
      { neighborhood: "Bethesda",      price: "$1,075,000", photo: "/sold/baltimore/9213Cedarcrest_Bethesda.jpg" },
      { neighborhood: "Silver Spring", price: "$640,000",   photo: "/sold/baltimore/13607Wendover_SilverSpring.webp" },
      { neighborhood: "Pikesville",    price: "$449,000",   photo: "/sold/baltimore/8216McDonogh_Pikesville.webp" },
      { neighborhood: "Potomac",       price: "$1,610,000", photo: "/sold/baltimore/8250Buckspark_Potomac.jpg" },
      { neighborhood: "Ellicott City", price: "$1,100,000", photo: "/sold/baltimore/13339Ridgewood_EllicotCity.webp" },
    ],
  },
];

export const DEFAULT_MARKET_SLUG = "atlanta";

// Brand-neutral backdrop for cold/unidentifiable traffic (no campaign link, no
// ZIP, geo miss). Rendered behind the auto-opened market picker — must carry
// zero market-specific branding. Empty slug → no picker card highlights.
export const NEUTRAL_MARKET: CampaignMarket = {
  slug: "",
  name: "",
  placeholder: true,
  sold: [],
};

// Tolerated inbound aliases only — each resolves TO the canonical slug.
const SLUG_ALIASES: Record<string, string> = {
  "maryland-suburbs": "baltimore", // legacy links; canonical market is baltimore
  "south-maryland": "southern-maryland",
  nova: "northern-virginia",
};

export function getCampaignMarket(slug?: string | null): CampaignMarket {
  if (!slug) return CAMPAIGN_MARKETS.find((m) => m.slug === DEFAULT_MARKET_SLUG)!;
  const resolved = SLUG_ALIASES[slug] ?? slug;
  return (
    CAMPAIGN_MARKETS.find((m) => m.slug === resolved) ??
    CAMPAIGN_MARKETS.find((m) => m.slug === DEFAULT_MARKET_SLUG)!
  );
}

export const MARKET_OPTIONS = CAMPAIGN_MARKETS.map((m) => ({ slug: m.slug, name: m.name }));
