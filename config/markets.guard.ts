// ─────────────────────────────────────────────────────────────────────────────
// Drift guard between the SITE market list (config/markets.ts) and the
// CAMPAIGN catalog (lib/markets.ts).
//
// Two lists exist because they answer to different owners: the campaign
// catalog is keyed by the operator API's exact `marketName` strings and is
// coupled to that API's contract; the site list is keyed by URL slug and owns
// the public site's IA. Collapsing them would couple curbio.com's URLs to a
// third party's naming, which is how /markets/wdc/ happened in the first place.
//
// What must never happen is the two SILENTLY diverging — a market added to one
// and not the other, or a slug renamed in one place. These are compile-time
// checks: `tsc --noEmit` fails if the lists disagree, so drift is caught in CI
// rather than as a 404 someone notices months later.
//
// This file is types-only at runtime; importing it costs nothing.
// ─────────────────────────────────────────────────────────────────────────────

import { BY_SLUG, SLUG_ALIASES } from "@/lib/markets";
import { MARKETS, LEGACY_SLUG_REDIRECTS } from "./markets";

/** Throws at module load (and therefore at build) if the lists disagree. */
export function assertMarketListsAgree(): void {
  const siteSlugs = new Set(MARKETS.map((m) => m.slug));
  const campaignSlugs = new Set(Object.keys(BY_SLUG));

  const missingFromSite = [...campaignSlugs].filter((s) => !siteSlugs.has(s));
  const missingFromCampaign = [...siteSlugs].filter((s) => !campaignSlugs.has(s));

  if (missingFromSite.length || missingFromCampaign.length) {
    throw new Error(
      "Market list drift between config/markets.ts and lib/markets.ts — " +
        `missing from site list: [${missingFromSite.join(", ")}]; ` +
        `missing from campaign catalog: [${missingFromCampaign.join(", ")}]. ` +
        "Add the market to BOTH, or explain the asymmetry here."
    );
  }

  // Every campaign alias should also be a known legacy slug on the site side,
  // so an old ?market= link and an old /markets/ URL resolve to the same place.
  const unmapped = Object.keys(SLUG_ALIASES).filter(
    (a) => !(a in LEGACY_SLUG_REDIRECTS) && !siteSlugs.has(a)
  );
  if (unmapped.length) {
    throw new Error(
      `Campaign slug aliases with no site-side mapping: [${unmapped.join(", ")}]. ` +
        "Add them to the market's legacySlugs so both surfaces agree."
    );
  }
}
