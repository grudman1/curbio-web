// ─────────────────────────────────────────────────────────────────────────────
// THE SERVICE LIST — the only place in this codebase a service is named.
//
// The homepage services marquee (components/home/HomeResults.tsx) and the
// /services index both render this array. Order matters: it is the marquee's
// display order, and it is an ARGUMENT — cleaning, paint and staging lead
// because they are what "fast cosmetic prep" means, and the trades that read
// as renovation (roofing, HVAC) come last so the list can never be skimmed as
// a remodelling menu.
//
// Each service has an ANCHOR on /services (`/services#kitchen-updates`), not
// its own route yet. When per-service pages arrive at /services/[slug], the
// slug field here is already the URL segment and `description` is the lede —
// a small later step, not a rewrite.
//
// Photos are the real category photography under public/home/results/,
// cropped to 560×800 (2× the marquee card) — see HomeResults.tsx history.
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceCategory =
  | "Refresh & update"
  | "Exterior & structure"
  | "Systems"
  | "Listing prep";

/** Display order for category groupings on /services. */
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Refresh & update",
  "Exterior & structure",
  "Systems",
  "Listing prep",
];

export type Service = {
  /** URL segment for the /services anchor today, /services/[slug] later. */
  slug: string;
  name: string;
  category: ServiceCategory;
  /** One line, Curbio voice: what it is and why it moves the price. */
  description: string;
  /** public/ path to the category photo (560×800). */
  photo: string;
};

export const SERVICES: Service[] = [
  {
    slug: "deep-cleaning-haul-away",
    name: "Deep cleaning & haul-away",
    category: "Listing prep",
    description:
      "Junk removal and a top-to-bottom clean — the last step before the photographer walks in.",
    photo: "/home/results/deep-cleaning-haul-away.jpg",
  },
  {
    slug: "interior-exterior-painting",
    name: "Interior & exterior painting",
    category: "Refresh & update",
    description:
      "Whole-home repaints in listing-ready neutrals — the highest-return line on most scopes.",
    photo: "/home/results/interior-exterior-painting.jpg",
  },
  {
    slug: "staging",
    name: "Staging",
    category: "Listing prep",
    description:
      "Professionally styled and photo-ready, coordinated with the rest of the scope so nothing waits on anything.",
    photo: "/home/results/staging.jpg",
  },
  {
    slug: "photography-ready-finish",
    name: "Photography-ready finish",
    category: "Listing prep",
    description:
      "The last pass before the shoot: styling touch-ups, bulbs matched, cords hidden, every room shot-ready.",
    // TODO(asset): no photography-ready-finish photo exists under
    // public/home/results/ — this reuses the staging card's image so the
    // marquee has no gap. Swap it the day the real category shot lands; the
    // slug and copy are final.
    photo: "/home/results/staging.jpg",
  },
  {
    slug: "flooring",
    name: "Flooring",
    category: "Refresh & update",
    description:
      "New carpet, LVP, and refinished hardwood — worn floors are the first thing buyers price against you.",
    photo: "/home/results/flooring.jpg",
  },
  {
    slug: "kitchen-updates",
    name: "Kitchen updates",
    category: "Refresh & update",
    description:
      "Counters, cabinets, hardware, and appliances — updated to what the comps have, not past it.",
    photo: "/home/results/kitchen-updates.jpg",
  },
  {
    slug: "bathroom-updates",
    name: "Bathroom updates",
    category: "Refresh & update",
    description:
      "From regrouting and new vanities to full gut renovations of dated baths.",
    photo: "/home/results/bathroom-updates.jpg",
  },
  {
    slug: "lighting-electrical",
    name: "Lighting & electrical",
    category: "Refresh & update",
    description:
      "Fixtures, recessed lighting, and the electrical repairs an inspector would flag.",
    photo: "/home/results/lighting-electrical.jpg",
  },
  {
    slug: "curb-appeal-landscaping",
    name: "Curb appeal & landscaping",
    category: "Exterior & structure",
    description:
      "Landscaping, power washing, front-door refreshes — the first photo is the showing that decides the rest.",
    photo: "/home/results/curb-appeal-landscaping.jpg",
  },
  {
    slug: "roofing-exterior-repair",
    name: "Roofing & exterior repair",
    category: "Exterior & structure",
    description:
      "Roof replacement, siding, gutters, and structural repairs — the items that kill deals in inspection.",
    photo: "/home/results/roofing-exterior-repair.jpg",
  },
  {
    slug: "hvac-plumbing",
    name: "HVAC & plumbing",
    category: "Systems",
    description:
      "System repairs and replacements handled by licensed trades, closed out with documentation.",
    photo: "/home/results/hvac-plumbing.jpg",
  },
];

export const SERVICE_BY_SLUG: Record<string, Service> = Object.fromEntries(
  SERVICES.map((s) => [s.slug, s])
);

/** Anchor on the /services index for a service. */
export function servicePath(slug: string): string {
  return `/services#${slug}`;
}
