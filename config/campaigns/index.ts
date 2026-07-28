import type { CampaignPage } from "./types";
import { sell } from "./sell";

export type { CampaignPage, ReferralSourceId } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN REGISTRY — every page served at /lp/<slug>.
//
// Adding a landing page:
//   1. create config/campaigns/<slug>.ts
//   2. import it and add it to the array below
//
// That is the whole procedure. No page file, no component, no route, no
// middleware change. generateStaticParams reads this array, so the page and
// its per-market variants prerender automatically.
//
// The registry is an EXPLICIT array rather than a directory glob: Next needs
// this statically analysable to prerender, and an explicit list means the set
// of live landing pages is one greppable thing rather than a filesystem
// side effect.
//
// Partner pages (/exp) use the same template but are NOT listed here — they
// live in the site tier at their own real paths. See config/campaigns/exp.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const CAMPAIGNS: CampaignPage[] = [sell];

export const CAMPAIGN_BY_SLUG: Record<string, CampaignPage> = Object.fromEntries(
  CAMPAIGNS.map((c) => [c.slug, c])
);
