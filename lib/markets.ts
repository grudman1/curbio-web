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
    region: "Baltimore · Maryland suburbs",
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
    region: "Northern Virginia · DC Metro",
    canonicalZip: "22030",
    cities: ["Arlington", "Alexandria", "Fairfax", "Reston", "Vienna"],
  },
  "South Maryland": {
    slug: "southern-maryland",
    label: "Southern Maryland",
    state: "MD",
    region: "Southern Maryland · DC Metro",
    canonicalZip: "20601",
    cities: ["Waldorf", "Bowie", "Upper Marlboro", "La Plata"],
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
  "washington-dc": "southern-maryland",
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

// Static list for the footer "markets we serve" links.
export const ALL_MARKETS: { slug: string; displayName: string }[] = Object.values(
  BY_MARKET_NAME
).map((e) => ({ slug: e.slug, displayName: `${e.label}, ${e.state}` }));

// Which HSM (and headshot) staffs each market — stable assignment used by the
// market chooser so it can render without an API call per card. Photo is null
// where we don't yet have a headshot (e.g. Joshua's DC-metro markets).
const SLUG_HSM: Record<string, { first: string; photo: string | null }> = {
  atlanta: { first: "Christine", photo: "/hsm/christine-harvey.jpg" },
  baltimore: { first: "Lisa", photo: "/hsm/lisa-tucker.jpg" },
  dallas: { first: "Miguel", photo: "/hsm/miguel-picart.jpg" },
  "los-angeles": { first: "Trevor", photo: "/hsm/trevor-laramee.jpg" },
  riverside: { first: "Trevor", photo: "/hsm/trevor-laramee.jpg" },
  "northern-virginia": { first: "Joshua", photo: null },
  "southern-maryland": { first: "Joshua", photo: null },
};

export type MarketCard = {
  slug: string;
  label: string; // "Atlanta, GA"
  region: string;
  hsmFirst: string;
  photo: string | null;
};

export const MARKET_CARDS: MarketCard[] = Object.values(BY_MARKET_NAME).map((e) => ({
  slug: e.slug,
  label: `${e.label}, ${e.state}`,
  region: e.region,
  hsmFirst: SLUG_HSM[e.slug]?.first ?? "",
  photo: SLUG_HSM[e.slug]?.photo ?? null,
}));

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
    displayName: state ? `${label}, ${state}` : label,
    region: cat?.region ?? label,
    cities: cat?.cities ?? [],
    isBusinessHours: lead.isBusinessHours,
    hsm: {
      firstName,
      name: cleanName,
      title: member?.title ?? "Home Services Manager",
      bio:
        member?.bio ??
        `${firstName} helps ${label}-area agents and sellers get listings market-ready — on time and on budget. From the first walkthrough to closing, ${firstName} scopes the work, builds the plan, and stays accountable for the whole project.`,
      photo: member?.photo ?? null,
      phone: lead.pmPhone ? formatPhone(lead.pmPhone) : "",
      phoneRaw: lead.pmPhone ?? "",
      calendlyUrl: lead.pmCalendlyUrl ?? "#",
    },
  };
}
