import { expcon } from "./expcon";
import type { Giveaway } from "./types";

export type { Giveaway, KitIcon, KitItem, ListingAnswer, PublicGiveaway } from "./types";
export { ANSWER_LABEL, LISTING_ANSWERS, NOT_LISTED, publicGiveaway } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// GIVEAWAY REGISTRY — every prize drawing this app runs, by slug.
//
// An explicit array for the same reason config/campaigns/index.ts is one: the
// set of live giveaways is one greppable thing, and the submit endpoint can
// refuse a slug it has never heard of instead of minting a store for it.
//
// Adding the next event: a new file beside expcon.ts, a line here, and a page
// under app/(site)/ at the path the file names. The form, the entry store, the
// routing and the drawing are shared.
// ─────────────────────────────────────────────────────────────────────────────

export const GIVEAWAYS: Giveaway[] = [expcon];

const GIVEAWAY_BY_SLUG: Record<string, Giveaway> = Object.fromEntries(GIVEAWAYS.map((g) => [g.slug, g]));

/**
 * The giveaway with this slug, or null. The only way in from a slug that came
 * off a request: indexing the map directly would answer "constructor" or
 * "toString" with a function, not a giveaway.
 */
export function giveawayBySlug(slug: unknown): Giveaway | null {
  return typeof slug === "string" && Object.hasOwn(GIVEAWAY_BY_SLUG, slug) ? GIVEAWAY_BY_SLUG[slug] : null;
}
