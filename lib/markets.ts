import type { OperatorLead } from "./operator";
import { MARKETS, MARKET_BY_SLUG, MARKET_BY_OPERATOR_NAME, LEGACY_SLUG_REDIRECTS, type Market } from "@/config/markets";

// ─────────────────────────────────────────────────────────────────────────────
// Market catalog — DERIVED. config/markets.ts is the only place a market is
// named; everything below is a projection of that list plus the live operator
// API.
//
// This file used to declare its own catalog keyed by the operator API's
// `marketName` strings, which is how the slug "baltimore" entered the codebase
// for a market the API calls "Maryland" and marketing calls Maryland. Nothing
// here declares a market any more.
//
// What remains here is BEHAVIOUR, not data: slug canonicalisation, nearest-
// market geo, and the view model the page components render.
// ─────────────────────────────────────────────────────────────────────────────

export type CatalogEntry = {
  slug: string;
  label: string;
  state: string;
  region: string;
  canonicalZip: string;
  cities: string[];
};

function toCatalogEntry(m: Market): CatalogEntry {
  return {
    slug: m.slug,
    label: m.name,
    state: m.state,
    region: m.coverage,
    canonicalZip: m.canonicalZip,
    cities: m.cities,
  };
}

/** Keyed by the operator API's exact `marketName`. */
const BY_MARKET_NAME: Record<string, CatalogEntry> = Object.fromEntries(
  Object.entries(MARKET_BY_OPERATOR_NAME).map(([k, m]) => [k, toCatalogEntry(m)])
);

export const BY_SLUG: Record<string, CatalogEntry> = Object.fromEntries(
  MARKETS.map((m) => [m.slug, toCatalogEntry(m)])
);

/** Legacy spellings tolerated on ?market= links. Derived from legacySlugs. */
export const SLUG_ALIASES: Record<string, string> = { ...LEGACY_SLUG_REDIRECTS };

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

// Footer "markets we serve" links.
export const ALL_MARKETS: { slug: string; displayName: string }[] = MARKETS.map((m) => ({
  slug: m.slug,
  displayName: m.displayName,
}));



export type MarketCard = {
  slug: string;
  label: string; // "Atlanta, GA"
  region: string;
  hsmFirst: string;
  photo: string | null;
};



/** "Joshua Collins" → "Joshua". The config stores the full name (it is the
 *  TEAM registry's key); every first-name display derives from it, so the two
 *  can never drift apart. */
export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

// Picker order is the ORDER OF config/markets.ts — interleaved there so one
// HSM's markets aren't clustered. No second ordering list.
export const MARKET_CARDS: MarketCard[] = MARKETS.map((m) => ({
  slug: m.slug,
  label: m.displayName,
  region: m.coverage,
  hsmFirst: firstNameOf(m.hsm.name),
  photo: m.hsm.photo,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Geo fallback — approximate service-area centers, used to match a visitor to
// the NEAREST served market when their IP-geolocated ZIP isn't an exact match
// (IP geolocation is imprecise, so strict ZIP matching alone misses most metro
// visitors). Coordinates are rough metro centroids.
// ─────────────────────────────────────────────────────────────────────────────
const MARKET_COORDS: Record<string, { lat: number; lng: number }> = Object.fromEntries(
  MARKETS.map((m) => [m.slug, m.coordinates])
);

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
  name: string; // friendly market label, e.g. "Maryland"
  displayName: string; // e.g. "Maryland, MD"
  region: string; // e.g. "Baltimore · Maryland Suburbs"
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
  const hsmStatic = MARKET_BY_SLUG[s]?.hsm ?? null;
  const fullName = hsmStatic?.name ?? "";
  const firstName = firstNameOf(fullName);
  const label = cat.label;
  // Exact key lookup. This used to search TEAM for a bio CONTAINING the first
  // name, which silently missed any bio that doesn't happen to say the
  // person's name — Joshua Collins' does not, so his markets fell back to the
  // templated bio even though a real one was on file.
  const member = fullName ? TEAM[fullName] ?? null : null;
  return {
    slug: s,
    name: label,
    displayName: labelWithState(label, cat.state),
    region: cat.region,
    cities: cat.cities,
    isBusinessHours: false,
    hsm: {
      firstName,
      // Full name, matching what the live path renders — the config now
      // carries it, so an API outage no longer downgrades "Joshua Collins"
      // to a bare "Joshua" in the booking modal.
      name: fullName || "Your local team",
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
