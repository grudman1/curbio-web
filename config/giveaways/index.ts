import { expcon } from "./expcon";
import type { Giveaway } from "./types";

export type { Giveaway, GiveawayPrize, ListingAnswer, PrizeIcon, PublicGiveaway } from "./types";
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

export const GIVEAWAY_BY_SLUG: Record<string, Giveaway> = Object.fromEntries(
  GIVEAWAYS.map((g) => [g.slug, g])
);
