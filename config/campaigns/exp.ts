import type { CampaignPage } from "./types";
import { expcon } from "../giveaways/expcon";

// eXp Realty partner page — the SAME template as /lp/sell, mounted in a
// different tier.
//
// This is the generalisation test. /exp is a partner page, not a campaign page:
// it lives at a real path in the site group and becomes indexable at cutover,
// whereas campaign pages are never indexed. That difference is expressed by
// WHERE it is mounted (app/(site)/exp/) and by config/routes.ts — not by
// anything below. No field here can make a page indexable.
//
// Everything the old bespoke ExpShell did is expressible as data: the
// co-brand lockup comes from `partner`, whose copy and assets live in
// lib/partners.ts so the ~50 partner pages coming next are also data.
//
// Deliberately NOT in the CAMPAIGNS registry — that registry drives
// /lp/<slug>, and this page is not at /lp/.
export const exp: CampaignPage = {
  slug: "exp",

  meta: {
    title: "Curbio for eXp Realty — Pre-listing Home Improvement",
    description:
      "Curbio is the preferred pre-listing home improvement partner for eXp Realty agents. " +
      "Repairs, refreshes, and staging — fully managed, with pay-at-closing for qualified sellers.",
  },

  hero: {
    // Ignored on partner pages — the co-brand lockup takes this slot. Present
    // because the type requires it and because dropping `partner` should leave
    // a page that still reads correctly rather than one with a hole in it.
    eyebrow: { default: "{market} agents", neutral: "For listing agents" },
    headline: "We do the *prep.*\nYou make the *sale.*\nSeller pays *at close.*",
    sub: "Walk into every listing appointment with a better offer: the eXp prep solution. Repairs, landscaping, staging — and nothing due from your seller until close.",
    trust: ["8,000+ homes prepped", "1-year warranty", "Licensed & insured"],
  },

  sections: {
    soldProof: true,
    soldByLine: "*Sold by eXp agents* in {market}.",
    soldByLineNational: "*Sold by eXp agents.*",
    howItWorks: true,
    closer: "One listing. You'll wonder *why you waited.*",
  },

  market: { mode: "picker" },

  attribution: {
    source: "exp-realty-{marketSlug}",
    referralSourceId: "eXp realty",
  },

  partner: "exp",

  // eXpcon giveaway cross-promo. Ends when entries close, read from the
  // giveaway's own settings so the two can never disagree. Tags: the
  // "eXpcon 2026 · /exp banner" row in config/linkRegistry.ts — they keep
  // banner entries apart from the booth QR (event/qr) and the emails
  // (email/e); the eXp referral is added by /expcon itself.
  promoBanner: {
    id: "expcon-2026",
    lead: "At eXpcon, or not?",
    linkText: "Enter to win the Listing-Ready Kit",
    href:
      "https://sell.curbio.com/expcon?utm_source=partnership&utm_medium=collateral" +
      "&utm_campaign=partner-expcon-oct&utm_content=exp-banner",
    endsAt: expcon.closesAt,
  },
};
