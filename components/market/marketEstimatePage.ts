import type { CampaignPage } from "@/config/campaigns/types";

/** Copy/attribution only. Form mechanics remain unreachable from page config. */
export const MARKET_ESTIMATE_PAGE: CampaignPage = {
  slug: "market-estimate",
  hero: {
    eyebrow: { default: "Curbio Concierge in {market}", neutral: "Curbio Concierge" },
    headline: "Get your listing *market-ready*—without becoming the GC.",
    sub: "Your local Curbio team manages repairs, updates, and staging from walkthrough to market. Qualified sellers can pay at closing.",
    trust: ["8,000+ homes prepped", "1-year warranty", "Licensed & insured"],
  },
  cta: "Get my free estimate",
  sections: {
    soldProof: false,
    howItWorks: true,
    closer: "Bring us the listing. We'll manage the *prep.*",
  },
  market: { mode: "picker" },
  attribution: { source: "website-market-{marketSlug}" },
};
