// ─────────────────────────────────────────────────────────────────────────────
// Mapping guard between the SITE market list (config/markets.ts) and the
// CAMPAIGN catalog (lib/markets.ts).
//
// These are NOT the same list and must not be forced to agree on names:
//
//   site list      owns curbio.com's public URLs. Slugs are what MARKETING
//                  calls each market.
//   campaign       owns the operator API contract. Keyed by the API's exact
//   catalog        `marketName` strings ("NOVA", "DC", "Maryland").
//
// They already diverge on three of seven markets, correctly:
//
//   site "northern-virginia"  ↔  campaign "northern-virginia"  (API: NOVA)
//   site "washington-dc"      ↔  campaign "washington-dc"      (API: DC)
//   site "maryland"           ↔  campaign "baltimore"          (API: Maryland)
//
// Letting the API dictate public URLs is how /markets/wdc/ happened. Letting
// them drift silently is how /markets/baltimore/ started 404ing. So the site
// list wins on naming, and this file asserts the MAPPING between them stays
// total and one-to-one — checked at build time, so a market added to one side
// and not the other fails CI instead of surfacing as a dead URL later.
// ─────────────────────────────────────────────────────────────────────────────

import { BY_SLUG, SLUG_ALIASES } from "@/lib/markets";
import { MARKETS, LEGACY_SLUG_REDIRECTS, MARKET_BY_SLUG } from "./markets";

export function assertMarketListsAgree(): void {
  const problems: string[] = [];

  // 1. Every site market points at a real campaign catalog entry.
  for (const m of MARKETS) {
    if (!BY_SLUG[m.campaignSlug]) {
      problems.push(
        `site market "${m.slug}" has campaignSlug "${m.campaignSlug}", which is not in lib/markets.ts BY_SLUG`
      );
    }
  }

  // 2. The mapping is one-to-one — no two site markets claim the same campaign
  //    entry, and no campaign entry is left unclaimed.
  const claimed = new Map<string, string>();
  for (const m of MARKETS) {
    const existing = claimed.get(m.campaignSlug);
    if (existing) {
      problems.push(
        `campaign market "${m.campaignSlug}" is claimed by both "${existing}" and "${m.slug}"`
      );
    }
    claimed.set(m.campaignSlug, m.slug);
  }
  for (const campaignSlug of Object.keys(BY_SLUG)) {
    if (!claimed.has(campaignSlug)) {
      problems.push(
        `campaign market "${campaignSlug}" has no site market — add it to config/markets.ts or explain the asymmetry here`
      );
    }
  }

  // 3. A campaign slug that is NOT the site slug must be recorded as a legacy
  //    slug, so an old /markets/<campaignSlug> URL still resolves. This is the
  //    check that would have caught /markets/baltimore/ 404ing after the
  //    rename: "baltimore" is the campaign slug and had to remain redirectable.
  for (const m of MARKETS) {
    if (m.campaignSlug !== m.slug && !m.legacySlugs.includes(m.campaignSlug)) {
      problems.push(
        `site market "${m.slug}" renamed away from campaign slug "${m.campaignSlug}" without listing it in legacySlugs — the old URL would 404`
      );
    }
  }

  // 4. Every campaign-side alias resolves somewhere on the site side, so an old
  //    ?market= link and an old /markets/ URL land in the same place.
  for (const alias of Object.keys(SLUG_ALIASES)) {
    if (!(alias in LEGACY_SLUG_REDIRECTS) && !MARKET_BY_SLUG[alias]) {
      problems.push(
        `campaign slug alias "${alias}" has no site-side mapping — add it to the market's legacySlugs`
      );
    }
  }

  if (problems.length) {
    throw new Error(`Market list drift:\n  - ${problems.join("\n  - ")}`);
  }
}
