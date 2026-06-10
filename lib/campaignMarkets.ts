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
      { neighborhood: "Intown Atlanta", price: "$665,000", photo: "/sold/959Berne_Intown.jpeg" },
      { neighborhood: "Marietta", price: "$365,000", photo: "/sold/680Smithstone_Marietta.webp" },
      { neighborhood: "Roswell", price: "$785,000", photo: "/sold/905Windsor_Roswell.webp" },
      { neighborhood: "Acworth", price: "$497,000", photo: "/sold/5076OakBranch_Acworth.webp" },
      { neighborhood: "Lawrenceville", price: "$354,000", photo: "/sold/772Bostonian_Lawrenceville.webp" },
    ],
  },
  {
    slug: "dallas",
    name: "Dallas",
    placeholder: true,
    sold: [
      { neighborhood: "Dallas" },
      { neighborhood: "Plano" },
      { neighborhood: "Frisco" },
      { neighborhood: "Irving" },
      { neighborhood: "McKinney" },
    ],
  },
  {
    slug: "los-angeles",
    name: "Los Angeles",
    placeholder: true,
    sold: [
      { neighborhood: "Los Angeles" },
      { neighborhood: "Long Beach" },
      { neighborhood: "Pasadena" },
      { neighborhood: "Santa Monica" },
      { neighborhood: "Burbank" },
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
    placeholder: true,
    sold: [
      { neighborhood: "Arlington" },
      { neighborhood: "Alexandria" },
      { neighborhood: "Fairfax" },
      { neighborhood: "Falls Church" },
      { neighborhood: "McLean" },
    ],
  },
  {
    slug: "washington-dc",
    name: "Washington, DC",
    placeholder: true,
    sold: [
      { neighborhood: "Capitol Hill" },
      { neighborhood: "Georgetown" },
      { neighborhood: "Shaw" },
      { neighborhood: "Petworth" },
      { neighborhood: "Brookland" },
    ],
  },
  {
    slug: "maryland-suburbs",
    name: "Maryland Suburbs",
    sold: [
      { neighborhood: "Bethesda",     photo: "/sold/9213Cedarcrest_Bethesda.jpg" },
      { neighborhood: "Silver Spring", photo: "/sold/13607Wendover_SilverSpring.webp" },
      { neighborhood: "Pikesville",   photo: "/sold/8216McDonogh_Pikesville.webp" },
      { neighborhood: "Potomac",      photo: "/sold/8250Buckspark_Potomac.jpg" },
      { neighborhood: "Ellicott City", photo: "/sold/13339Ridgewood_EllicotCity.webp" },
    ],
  },
];

export const DEFAULT_MARKET_SLUG = "atlanta";

// Map old MARKET_CARDS slugs (from lib/markets.ts) to campaign slugs.
const SLUG_ALIASES: Record<string, string> = {
  baltimore: "maryland-suburbs",
  "south-maryland": "maryland-suburbs",
  "southern-maryland": "maryland-suburbs",
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
