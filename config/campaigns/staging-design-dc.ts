import type { CampaignPage } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Staging Design DC — partner page, CONSUMER audience.
//
// Every other page on this template addresses agents. This one addresses a
// homeowner who called Staging Design DC to have their house staged and was
// told the house needs work first. That is the whole frame, and it is why the
// copy leads with their name rather than Curbio's.
//
// WHAT THIS PAGE MUST NOT IMPLY: that Curbio and Staging Design DC divide the
// work between them. Curbio is a general contractor and subcontracts staging
// like any other trade — staging is a Curbio service here and everywhere else
// on the site. What is specific to this page is WHO does it: in the DMV, that
// is Staging Design DC, as a Curbio Preferred Vendor. One contract, one point
// of contact, and the staging is still done by the company the homeowner
// already called.
//
// NO market resolution (`mode: "none"`). The form collects a ZIP and the CRM
// parses it, which is what curbio.com does today. One page covers DC,
// Maryland and Virginia without inventing a market or a region mode — the
// three existing markets (washington-dc, maryland, northern-virginia) already
// cover the DMV and are untouched by this page.
//
// Mounted at app/(site)/staging-design-dc/, not /lp/, because it is a partner
// page that will earn inbound links. Indexability comes from config/routes.ts,
// never from this file.
// ─────────────────────────────────────────────────────────────────────────────
export const stagingDesignDc: CampaignPage = {
  slug: "staging-design-dc",

  meta: {
    title: "Staging Design DC + Curbio — Repairs and Updates, Paid at Closing",
    description:
      "Staging Design DC is a Curbio Preferred Vendor. Curbio handles the repairs and updates your " +
      "home needs before it lists — with the staging still done by the Staging Design DC team. " +
      "Nothing due until your home sells.",
  },

  hero: {
    // Ignored on partner pages — the co-brand lockup takes this slot. Kept
    // coherent so that dropping `partner` leaves a page that still reads.
    eyebrow: {
      default: "{market} homeowners",
      neutral: "For DC, Maryland & Virginia homeowners",
    },
    headline: "Your home,\n*list-ready.*\nPaid *at closing.*",
    sub:
      "You called Staging Design DC — and the house needs some work first. Curbio handles all of " +
      "it as your general contractor, with the staging still done by the Staging Design DC team " +
      "you already called. Nothing due until your home sells.",
    trust: ["8,000+ homes prepped", "1-year warranty", "Licensed & insured"],
    phone: { display: "(844) 944-2629", tel: "+18449442629" },
  },

  sections: {
    // Explicitly false, not left to the side effect. A `none` page resolves no
    // market, and the strip hides itself when the market has no listings — but
    // relying on that would make this page's layout depend on data it never
    // reads. Say it.
    soldProof: false,
    howItWorks: true,
    closer: "One call. One contract. *One team.*",
  },

  market: { mode: "none" },

  showZip: true,
  zipLabel: "Your home's ZIP code",

  attribution: {
    // No {marketSlug} token: this is ONE campaign across the DMV, and the page
    // resolves no market to interpolate anyway.
    source: "staging-design-dc",
    referralSourceId: "Staging Design DC",
    // Everyone who lands here came through the partner — nobody searches for
    // this page. Fills utm_source ONLY when the visitor carries none; a real
    // one always wins. See FormCard for the two rules that keep it a default.
    defaultUtmSource: "partnership",
  },

  partner: "staging-design-dc",
};
