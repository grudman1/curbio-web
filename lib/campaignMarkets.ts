// ─────────────────────────────────────────────────────────────────────────────
// Campaign market view — DERIVED from config/markets.ts.
//
// This file used to declare its own list of markets with its own slugs, names
// and alias table — one of the six lists that had drifted, and the second
// place the slug "baltimore" was written down. It declares no market now: the
// header picker, every market-named string on the campaign pages, and the
// sold-proof strip all read the single list.
//
// The TYPE stays because the campaign components are written against it, and
// NEUTRAL_MARKET stays because "no market" is a real state that no row in the
// market list can represent.
// ─────────────────────────────────────────────────────────────────────────────

import { MARKETS, MARKET_BY_SLUG, resolveMarketSlug, type SoldListing } from "@/config/markets";

export type { SoldListing };

export type CampaignMarket = {
  slug: string;
  name: string; // shown in the tag, eyebrows, form payload
  /** true when sold listings lack verified prices (placeholder proof) */
  placeholder?: boolean;
  sold: SoldListing[];
};

export const CAMPAIGN_MARKETS: CampaignMarket[] = MARKETS.map((m) => ({
  slug: m.slug,
  name: m.name,
  sold: m.sold,
}));

export const DEFAULT_MARKET_SLUG = "atlanta";

// Brand-neutral backdrop for cold/unidentifiable traffic (no campaign link, no
// ZIP, geo miss). Rendered behind the auto-opened market picker — must carry
// zero market-specific branding. Empty slug → no picker card highlights.
export const NEUTRAL_MARKET: CampaignMarket = {
  slug: "",
  name: "",
  placeholder: true,
  sold: [],
};

/**
 * Campaign market for a slug. Every legacy spelling is tolerated via the single
 * list's `legacySlugs`, so the local alias table this file used to keep is gone.
 *
 * Fallback behaviour is UNCHANGED and deliberate: absent or unrecognised slugs
 * return the default market, not the neutral one. The neutral state is chosen
 * upstream by useMarketResolution when it genuinely cannot identify a visitor;
 * returning it from here instead would blank the page for anyone arriving on a
 * campaign link with a typo'd slug.
 */
export function getCampaignMarket(slug?: string | null): CampaignMarket {
  const fallback = CAMPAIGN_MARKETS.find((m) => m.slug === DEFAULT_MARKET_SLUG)!;
  if (!slug) return fallback;
  const canonical = resolveMarketSlug(slug);
  if (!canonical) return fallback;
  const m = MARKET_BY_SLUG[canonical];
  return { slug: m.slug, name: m.name, sold: m.sold };
}

export const MARKET_OPTIONS = CAMPAIGN_MARKETS.map((m) => ({ slug: m.slug, name: m.name }));
