import { MARKETS } from "@/config/markets";

// ─────────────────────────────────────────────────────────────────────────────
// A NATIONAL MIX of sold homes — one per market, for a page whose visitors
// come from everywhere.
//
// The campaign pages show one market's listings because they know which market
// the visitor is in. At a national conference nobody's market is known when
// the page loads (and every phone in the hall geolocates to Salt Lake City),
// so showing Seattle's five homes to an agent from Dallas says "not for you".
//
// DERIVED from config/markets.ts, never listed here: the first listing in each
// market that has a photo AND a verified sale price. Three rules ride on that:
//
//   - `unverified` listings are skipped. That flag marks a Zestimate, and the
//     heading above this strip says "Sold".
//   - A market with no qualifying listing is simply absent — never padded with
//     another market's home (README, "NEVER borrow another market's listings").
//   - Adding a market, or its first verified sale, changes this strip with no
//     edit here.
// ─────────────────────────────────────────────────────────────────────────────

export type SoldMixHome = {
  marketSlug: string;
  /** "Atlanta", "Washington, DC" — the market's `name` in config/markets.ts,
   *  and the card's only label. The neighbourhood is deliberately not carried:
   *  at a national event the market is what an agent scans for, and a street
   *  name from another city is noise. */
  market: string;
  price: string;
  photo: string;
};

export function nationalSoldMix(): SoldMixHome[] {
  const homes: SoldMixHome[] = [];
  for (const m of MARKETS) {
    const listing = m.sold.find((s) => s.photo && s.price && !s.unverified);
    if (!listing?.photo || !listing.price) continue;
    homes.push({
      marketSlug: m.slug,
      market: m.name,
      price: listing.price,
      photo: listing.photo,
    });
  }
  return homes;
}
