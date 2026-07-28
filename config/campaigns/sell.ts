import type { CampaignPage } from "./types";

// sell.curbio.com — the first instance of the template, not a special case.
//
// Every string below is the copy this page has been running in production.
// It converts at ~10%; the rendered DOM is diffed against production on every
// change and must not move. If a future template change cannot express this
// page byte-for-byte, the template change is wrong.
//
// `meta` is deliberately absent: this page has never set its own title or
// description and inherits the root layout's. Adding them would emit different
// <title>/<meta> tags than production serves today.
export const sell: CampaignPage = {
  slug: "sell",

  hero: {
    eyebrow: { default: "{market} agents", neutral: "For listing agents" },
    headline: "We do the *prep.*\nYou make the *sale.*\nSeller pays *at close.*",
    sub: "Move-in ready sells. Your seller pays nothing until it closes.",
    trust: ["8,000+ homes prepped", "1-year warranty", "Licensed & insured"],
  },

  sections: {
    soldProof: true,
    howItWorks: true,
    closer: "One listing. You'll wonder *why you waited.*",
  },

  market: { mode: "picker" },

  attribution: {
    // Matches the source this page has always sent: `email-campaign-<slug>`,
    // falling back to "unknown" when no market resolved.
    source: "email-campaign-{marketSlug}",
  },
};
