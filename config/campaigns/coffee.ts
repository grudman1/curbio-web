import type { CampaignPage } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Team-lead coffee card — the direct-mail campaign page, Nov 2026.
//
// Fifty handwritten Curbio cards with a Starbucks gift card went to real estate
// team leads in Atlanta, Dallas, Los Angeles, Seattle and the DC area. The card
// says "Coffee's on us." and lists curbio.com/coffee on the back; WordPress
// redirects that to
//
//   https://sell.curbio.com/lp/coffee?utm_source=mail&utm_medium=direct_mail&utm_campaign=teamlead-starbucks-nov
//
// The HSM in each market calls the team lead the day the card arrives. This
// page is the backup path — a team lead who wants to reach out first, or to
// look us up before the call — and its one job is a 15-minute booking with
// the local HSM. Expect phones.
//
// The hero carries the standard trust row (/lp/sell's three items, same icons)
// so the page reads as Curbio, not as a one-off; the card's own three points
// stay on the card. The fixed "How it works" band is off. The bottom of the
// page is the navy closer, whose button scrolls back to the one form. The
// confirm page is the shared one, unchanged.
//
// ATTRIBUTION: channel comes from utm_source at request time (lib/channels.ts)
// — `mail` was added to the closed list for this campaign. `defaultUtmSource`
// is the documented fallback for a visitor whose tags got lost between the
// card and this page; it never overrides a real tag and is never persisted.
// No partner, no referral source: this is an owned page.
// ─────────────────────────────────────────────────────────────────────────────
export const coffee: CampaignPage = {
  slug: "coffee",

  meta: {
    title: "Coffee's on us — Curbio",
    // Matches the hero subline.
    description:
      "Let’s grab 15 minutes. Then try us on your next listing, with a free estimate and " +
      "no commitment.",
  },

  hero: {
    eyebrow: { default: "For {market} team leads", neutral: "For team leads" },
    headline: "Coffee’s *on us.*",
    sub: "Let’s grab 15 minutes. Then try us on your next listing, with a free estimate and no commitment.",
    // The standard trust row, exactly as /lp/sell runs it. Icons are fixed per
    // position, so the order matters: homes, warranty, licensed.
    trust: ["8,000+ homes prepped", "1-year warranty", "Licensed & insured"],
    // The mailed card, drawn in code (components/HeroVisual.tsx), so the
    // page is recognisably the thing that arrived in the post. Under the copy
    // on desktop, under the form on a phone.
    visual: "coffee-card",
  },

  // Overrides the running cta-copy experiment: one button text, everywhere
  // it appears (hero form, closer).
  cta: "Book 15 minutes with your local Curbio rep.",

  sections: {
    // The visitor's own market once it is known; the national one-per-market
    // strip until then.
    soldProof: true,
    // Off: its copy is fixed and the card's three points are in the hero.
    howItWorks: false,
    closer: "Try us on your next listing. *Start with 15 minutes.*",
  },

  // Same as /lp/sell: ?zip=, ?market=, IP geo, then the picker. The lead
  // routes to that market's HSM as usual.
  market: { mode: "picker" },
  // Always ask for a ZIP so every lead carries one — the CRM routes on it too.
  showZip: true,
  zipLabel: "Your ZIP code",

  attribution: {
    source: "teamlead-coffee-{marketSlug}",
    defaultUtmSource: "mail",
  },
};
