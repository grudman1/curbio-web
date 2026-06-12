import type { OperatorLead } from "./operator";

// ─────────────────────────────────────────────────────────────────────────────
// Market catalog
//
// HSM identity (name / phone / Calendly), market name, and in-market/business-
// hours status all come LIVE from the operator API (lib/operator.ts). This
// catalog only supplies the editorial trimmings the API doesn't return — a
// stable slug, a friendly label + state, a canonical zip to query for ?market=
// campaign links, and a few representative cities. Keyed by the API's exact
// `marketName` string.
// ─────────────────────────────────────────────────────────────────────────────

export type CatalogEntry = {
  slug: string;
  label: string;
  state: string;
  region: string;
  canonicalZip: string;
  cities: string[];
};

const BY_MARKET_NAME: Record<string, CatalogEntry> = {
  Atlanta: {
    slug: "atlanta",
    label: "Atlanta",
    state: "GA",
    region: "Metro Atlanta · North GA",
    canonicalZip: "30002",
    cities: ["Atlanta", "Marietta", "Alpharetta", "Decatur", "Sandy Springs"],
  },
  Baltimore: {
    slug: "baltimore",
    label: "Baltimore",
    state: "MD",
    region: "Baltimore · Maryland Suburbs",
    canonicalZip: "21201",
    cities: ["Baltimore", "Bethesda", "Rockville", "Silver Spring", "Columbia"],
  },
  Dallas: {
    slug: "dallas",
    label: "Dallas",
    state: "TX",
    region: "DFW Metroplex",
    canonicalZip: "75201",
    cities: ["Dallas", "Plano", "Frisco", "Arlington", "Fort Worth"],
  },
  "Los Angeles": {
    slug: "los-angeles",
    label: "Los Angeles",
    state: "CA",
    region: "Greater Los Angeles",
    canonicalZip: "90001",
    cities: ["Los Angeles", "Long Beach", "Pasadena", "Glendale", "Santa Monica"],
  },
  Riverside: {
    slug: "riverside",
    label: "Riverside",
    state: "CA",
    region: "Inland Empire · Riverside",
    canonicalZip: "92503",
    cities: ["Riverside", "Corona", "Moreno Valley", "Temecula"],
  },
  NOVA: {
    slug: "northern-virginia",
    label: "Northern Virginia",
    state: "VA",
    region: "Arlington · Manassas",
    canonicalZip: "22030",
    cities: ["Arlington", "Alexandria", "Fairfax", "Reston", "Vienna"],
  },
  "South Maryland": {
    slug: "southern-maryland",
    label: "Southern Maryland",
    state: "MD",
    region: "Waldorf · Clinton",
    canonicalZip: "20601",
    cities: ["Waldorf", "Bowie", "Upper Marlboro", "La Plata"],
  },
  // Keyed by the API's exact marketName — it returns "DC", not "Washington DC".
  DC: {
    slug: "washington-dc",
    label: "Washington, DC",
    state: "DC",
    region: "",
    canonicalZip: "20001",
    cities: ["Washington", "Georgetown", "Capitol Hill", "Navy Yard"],
  },
};

export const BY_SLUG: Record<string, CatalogEntry> = Object.fromEntries(
  Object.values(BY_MARKET_NAME).map((e) => [e.slug, e])
);

// Tolerate older/alternate campaign slugs so existing ?market= links keep working.
export const SLUG_ALIASES: Record<string, string> = {
  nova: "northern-virginia",
  "los-angeles-ca": "los-angeles",
  la: "los-angeles",
  "south-maryland": "southern-maryland",
  "maryland-suburbs": "baltimore",
};

export function canonicalSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const s = slug.trim().toLowerCase();
  const resolved = SLUG_ALIASES[s] ?? s;
  return BY_SLUG[resolved] ? resolved : null;
}

export function canonicalZipForSlug(slug: string | null | undefined): string | null {
  const s = canonicalSlug(slug);
  return s ? BY_SLUG[s].canonicalZip : null;
}

// "Label, ST" — but never doubled when the label already carries the state
// (e.g. "Washington, DC" must not become "Washington, DC, DC").
function labelWithState(label: string, state: string): string {
  return label.endsWith(`, ${state}`) ? label : `${label}, ${state}`;
}

// Static list for the footer "markets we serve" links.
export const ALL_MARKETS: { slug: string; displayName: string }[] = Object.values(
  BY_MARKET_NAME
).map((e) => ({ slug: e.slug, displayName: labelWithState(e.label, e.state) }));

// Which HSM (and headshot) staffs each market — stable assignment used by the
// market chooser so it can render without an API call per card. Photo is null
// where we don't yet have a headshot (e.g. Joshua's DC-metro markets).
const SLUG_HSM: Record<string, { first: string; photo: string | null }> = {
  atlanta: { first: "Christine", photo: "/hsm/christine-harvey.jpg" },
  baltimore: { first: "Lisa", photo: "/hsm/lisa-tucker.jpg" },
  dallas: { first: "Miguel", photo: "/hsm/miguel-picart.jpg" },
  "los-angeles": { first: "Trevor", photo: "/hsm/trevor-laramee.jpg" },
  riverside: { first: "Trevor", photo: "/hsm/trevor-laramee.jpg" },
  "northern-virginia": { first: "Joshua", photo: "/hsm/joshua-collins.jpg" },
  "southern-maryland": { first: "Joshua", photo: "/hsm/joshua-collins.jpg" },
  "washington-dc": { first: "Joshua", photo: "/hsm/joshua-collins.jpg" },
};

export type MarketCard = {
  slug: string;
  label: string; // "Atlanta, GA"
  region: string;
  hsmFirst: string;
  photo: string | null;
};

// Display order for the chooser grid (2 rows × 4 on desktop) — interleaved so
// the same HSM's markets aren't clustered side by side.
const CARD_ORDER = [
  "atlanta",
  "washington-dc",
  "dallas",
  "baltimore",
  "northern-virginia",
  "los-angeles",
  "southern-maryland",
  "riverside",
];

export const MARKET_CARDS: MarketCard[] = [...Object.values(BY_MARKET_NAME)]
  .sort((a, b) => CARD_ORDER.indexOf(a.slug) - CARD_ORDER.indexOf(b.slug))
  .map((e) => ({
    slug: e.slug,
    label: labelWithState(e.label, e.state),
    region: e.region,
    hsmFirst: SLUG_HSM[e.slug]?.first ?? "",
    photo: SLUG_HSM[e.slug]?.photo ?? null,
  }));

// ─────────────────────────────────────────────────────────────────────────────
// Geo fallback — approximate service-area centers, used to match a visitor to
// the NEAREST served market when their IP-geolocated ZIP isn't an exact match
// (IP geolocation is imprecise, so strict ZIP matching alone misses most metro
// visitors). Coordinates are rough metro centroids.
// ─────────────────────────────────────────────────────────────────────────────
const MARKET_COORDS: Record<string, { lat: number; lng: number }> = {
  atlanta: { lat: 33.749, lng: -84.388 },
  baltimore: { lat: 39.13, lng: -76.85 }, // Baltimore + Montgomery MD suburbs
  dallas: { lat: 32.7767, lng: -96.797 },
  "los-angeles": { lat: 34.0522, lng: -118.2437 },
  riverside: { lat: 33.9533, lng: -117.3962 },
  "northern-virginia": { lat: 38.8462, lng: -77.3064 },
  "southern-maryland": { lat: 38.7, lng: -76.85 }, // Charles + PG counties
  "washington-dc": { lat: 38.9072, lng: -77.0369 },
};

const GEO_NEAREST_MILES = 75;

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Nearest served market to a lat/lng, within GEO_NEAREST_MILES. Prefers markets
 * in the visitor's state (so a DC visitor gets Washington, DC over the closer-by
 * MD/VA markets, and LA vs Riverside disambiguate sensibly) and falls back to
 * nearest-overall when no served market shares the state. Returns a slug or null.
 */
export function nearestServedMarket(
  lat: number,
  lng: number,
  region?: string | null
): string | null {
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  const ranked = Object.entries(MARKET_COORDS)
    .map(([slug, c]) => ({ slug, miles: haversineMiles(lat, lng, c.lat, c.lng), state: BY_SLUG[slug].state }))
    .sort((a, b) => a.miles - b.miles);
  const r = (region ?? "").trim().toUpperCase();
  const sameState = r ? ranked.filter((m) => m.state === r) : [];
  const pool = sameState.length ? sameState : ranked;
  const best = pool[0];
  return best && best.miles <= GEO_NEAREST_MILES ? best.slug : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolved view model — what the page components render.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Team registry — real bios + headshots, keyed by the exact `pmName` the
// operator API returns. When a resolved HSM has an entry here, the card shows
// their real photo, title, and bio; otherwise it falls back to a templated bio
// and a branded placeholder (e.g. markets the API routes to someone without a
// supplied bio).
// ─────────────────────────────────────────────────────────────────────────────
type TeamMember = { photo: string; title: string; bio: string };

const TEAM: Record<string, TeamMember> = {
  "Christine Harvey": {
    photo: "/hsm/christine-harvey.jpg",
    title: "Home Services Manager",
    bio: "A top-5% lifetime-producing REALTOR® with $80M+ in recent sales, Christine leads design and home-improvement projects across metro Atlanta — managing vendors, timelines, budgets, and quality from the first walkthrough to closing.",
  },
  "Lisa Tucker": {
    photo: "/hsm/lisa-tucker.jpg",
    title: "Home Services Manager",
    bio: "A former listing agent, Lisa knows firsthand what it takes to get a home market-ready. She brings that agent-side perspective to every project — keeping it organized, on schedule, and low-stress while maximizing value.",
  },
  "Miguel Picart": {
    photo: "/hsm/miguel-picart.jpg",
    title: "Home Services Manager",
    bio: "A REALTOR® of 10 years with a background in architecture, Miguel brings a sharp eye for design and buyer expectations. He takes a hands-on approach and communicates clearly, so the process stays smooth from first walkthrough to sold.",
  },
  "Trevor Laramee": {
    photo: "/hsm/trevor-laramee.jpg",
    title: "Home Services Manager",
    bio: "With two decades as a licensed agent in Southern California, Trevor specializes in the upgrades that drive the highest ROI for sellers — delivering projects on time and on budget so clients maximize their equity.",
  },
  "Aaron Glines": {
    photo: "/hsm/aaron-glines.jpg",
    title: "VP, Sales & Operations",
    bio: "Aaron is Curbio's VP of Sales & Operations. With deep construction and operations experience, he helps agents prepare homes for sale through strategic, pre-listing renovations — maximizing value and reducing friction for their clients.",
  },
  "Joshua Collins": {
    photo: "/hsm/joshua-collins.jpg",
    title: "Home Services Manager",
    // {market} is replaced with the resolved market label (NOVA / Southern Maryland).
    bio: "A master plumber and certified home inspector with 20+ years of construction experience in the {market} market — handling every project personally for quality and on-time delivery.",
  },
};

export type ResolvedMarket = {
  slug: string;
  name: string; // friendly market label, e.g. "Baltimore"
  displayName: string; // e.g. "Baltimore, MD"
  region: string; // e.g. "Baltimore · Maryland suburbs"
  cities: string[];
  isBusinessHours: boolean;
  hsm: {
    firstName: string;
    name: string;
    title: string;
    bio: string;
    photo: string | null; // real headshot path, or null → branded placeholder
    phone: string; // formatted, e.g. "(240) 630-4083"
    phoneRaw: string; // e.g. "+12406304083" (for tel: links)
    calendlyUrl: string;
  };
};

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  const n = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (n.length !== 10) return raw;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Build a minimal ResolvedMarket from the static catalog alone — no API call.
 * Used when the operator API fails in step 1 so that a ?market= email link
 * always lands on the correct market page regardless of API health.
 * isBusinessHours is conservatively false; HSM phone/calendly are empty.
 */
export function buildResolvedMarketFromSlug(
  slug: string | null | undefined
): ResolvedMarket | null {
  const s = canonicalSlug(slug);
  if (!s) return null;
  const cat = BY_SLUG[s];
  if (!cat) return null;
  const hsmStatic = SLUG_HSM[s] ?? null;
  const firstName = hsmStatic?.first ?? "";
  const label = cat.label;
  const member = firstName ? Object.values(TEAM).find((m) => m.bio.includes(firstName)) ?? null : null;
  return {
    slug: s,
    name: label,
    displayName: labelWithState(label, cat.state),
    region: cat.region,
    cities: cat.cities,
    isBusinessHours: false,
    hsm: {
      firstName,
      name: firstName || "Your local team",
      title: member?.title ?? "Home Services Manager",
      bio: (
        member?.bio ??
        `${firstName || "Your local manager"} helps ${label}-area agents and sellers get listings market-ready — on time and on budget.`
      ).replace(/\{market\}/g, label),
      photo: hsmStatic?.photo ?? null,
      phone: "",
      phoneRaw: "",
      calendlyUrl: "#",
    },
  };
}

/**
 * Turn a live OperatorLead into the page view model. Returns null for
 * out-of-market / incomplete leads so the caller shows the neutral state.
 * Unknown market names (not in the catalog) still personalize from the API.
 */
export function buildResolvedMarket(
  lead: OperatorLead | null
): ResolvedMarket | null {
  if (!lead || lead.isOutOfMarket || !lead.marketName || !lead.pmName) return null;

  const cat = BY_MARKET_NAME[lead.marketName] ?? null;
  const label = cat?.label ?? lead.marketName;
  const state = cat?.state ?? "";
  // The API sometimes returns names with non-breaking spaces (e.g.
  // "Miguel Picart") — normalize before lookup/display.
  const cleanName = lead.pmName.replace(/\s+/g, " ").trim();
  const firstName = cleanName.split(" ")[0] || cleanName;
  const member = TEAM[cleanName] ?? null;

  return {
    slug: cat?.slug ?? slugify(lead.marketName),
    name: label,
    displayName: state ? labelWithState(label, state) : label,
    region: cat?.region ?? label,
    cities: cat?.cities ?? [],
    isBusinessHours: lead.isBusinessHours,
    hsm: {
      firstName,
      name: cleanName,
      title: member?.title ?? "Home Services Manager",
      bio: (
        member?.bio ??
        `${firstName} helps ${label}-area agents and sellers get listings market-ready — on time and on budget. From the first walkthrough to closing, ${firstName} scopes the work, builds the plan, and stays accountable for the whole project.`
      ).replace(/\{market\}/g, label),
      photo: member?.photo ?? null,
      phone: lead.pmPhone ? formatPhone(lead.pmPhone) : "",
      phoneRaw: lead.pmPhone ?? "",
      calendlyUrl: lead.pmCalendlyUrl ?? "#",
    },
  };
}
