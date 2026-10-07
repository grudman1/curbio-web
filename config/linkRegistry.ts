// ─────────────────────────────────────────────────────────────────────────────
// The Links registry SEED — what already exists in the world, imported so the
// registry starts as a true inventory rather than an empty table.
//
// Two sources:
//   linkRegistrySeed.json   every url redirect from the WordPress Redirection
//                           export (scripts/import-redirect-log.mjs). Owner
//                           unknown, channel derived from the target's
//                           utm_source by the closed-list rule. NOTE: these
//                           redirects live in the WordPress plugin — they must
//                           be recreated at cutover or every link through
//                           them dies.
//   HSM_CARD_LINKS below    the business cards already issued. Only Trevor's
//                           destination is documented (the brief: his card
//                           points straight at sell.curbio.com — the exact
//                           case the printed-permanence rule exists for). The
//                           other cards are real, but their URLs have not
//                           been recovered from the printed cards; listing
//                           them keeps the gap visible instead of forgotten.
//   EVENT_LINKS below       QR codes printed for a show. Recorded here rather
//                           than created in the UI so the row is in the
//                           same pull request as the page it points at.
//
// Rows created in the UI live in Redis (lib/marketingLinksStore.ts), never
// here. Seed rows are read-only in the UI — correcting one means correcting
// this file or re-running the import, both reviewable in git.
// ─────────────────────────────────────────────────────────────────────────────

import type { TrackedLink } from "@/lib/marketingLinks";
import seed from "./linkRegistrySeed.json";

export const LINK_SEED_EXPORTED_AT: string = seed.exportedAt;

const HSM_CARD_LINKS: TrackedLink[] = [
  {
    id: "card:trevor-laramee",
    label: "Trevor Laramee · business card QR",
    type: "qr",
    owner: "Trevor Laramee",
    channel: "hsm_field",
    medium: "business_card",
    campaign: "",
    market: "all",
    destination: "https://sell.curbio.com/",
    trackedUrl: "https://sell.curbio.com/",
    shortLink: "",
    status: "printed",
    createdAt: null,
    printedAt: null,
    origin: "seed",
    notes:
      "Documented case: the QR points at sell.curbio.com directly, with no UTM and no redirect in between — it cannot be repointed and its leads land as direct.",
  },
  {
    id: "card:christine-harvey",
    label: "Christine Harvey · business card",
    type: "print",
    owner: "Christine Harvey",
    channel: "hsm_field",
    medium: "business_card",
    campaign: "",
    market: "atlanta",
    destination: "",
    trackedUrl: "",
    shortLink: "",
    status: "printed",
    createdAt: null,
    printedAt: null,
    origin: "seed",
    notes: "URL not yet recovered from the printed card — check a physical card and record it here.",
  },
  {
    id: "card:joshua-collins",
    label: "Joshua Collins · business card",
    type: "print",
    owner: "Joshua Collins",
    channel: "hsm_field",
    medium: "business_card",
    campaign: "",
    market: "all",
    destination: "",
    trackedUrl: "",
    shortLink: "",
    status: "printed",
    createdAt: null,
    printedAt: null,
    origin: "seed",
    notes: "URL not yet recovered from the printed card — check a physical card and record it here.",
  },
  {
    id: "card:miguel-picart",
    label: "Miguel Picart · business card",
    type: "print",
    owner: "Miguel Picart",
    channel: "hsm_field",
    medium: "business_card",
    campaign: "",
    market: "dallas",
    destination: "",
    trackedUrl: "",
    shortLink: "",
    status: "printed",
    createdAt: null,
    printedAt: null,
    origin: "seed",
    notes: "URL not yet recovered from the printed card — check a physical card and record it here.",
  },
];

// ── eXpcon 2026 ──────────────────────────────────────────────────────────────
// The booth QR encodes https://sell.curbio.com/expcon and nothing else — no
// redirect and no tags in the URL (decided 2026-10-02; the QR had not been
// printed, so the WordPress short link was dropped). A visitor with no tags gets
// the page's own defaults (Channel event, medium qr, campaign
// expcon-giveaway-oct), which is exactly what this row records. The printed-
// permanence flag this row raises on the Links screen is deliberate: if
// /expcon ever moves, the page must keep answering at that path.
//
// Every OTHER way /expcon is promoted is a row below, so nobody types a UTM by
// hand. All of them carry the eXp referral automatically — the page adds it
// itself and ignores a referral in the URL — and a real tag always beats the
// page's defaults.
const EXPCON = "https://sell.curbio.com/expcon";
const expconTag = (source: string, medium: string, campaign: string, content?: string) =>
  `${EXPCON}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}${content ? `&utm_content=${content}` : ""}`;

const expconRow = (
  id: string,
  label: string,
  type: TrackedLink["type"],
  owner: string,
  channel: TrackedLink["channel"],
  medium: string,
  campaign: string,
  content: string | undefined,
  notes: string
): TrackedLink => ({
  id: `event:expcon-2026:${id}`,
  label,
  type,
  owner,
  channel,
  medium,
  campaign,
  market: "all",
  destination: EXPCON,
  trackedUrl: expconTag(channel, medium, campaign, content),
  shortLink: "",
  status: "draft",
  createdAt: "2026-10-02",
  printedAt: null,
  origin: "seed",
  notes,
});

const EVENT_LINKS: TrackedLink[] = [
  {
    id: "event:expcon-2026",
    label: "eXpcon 2026 · booth giveaway QR",
    type: "qr",
    owner: "Marketing",
    channel: "event",
    medium: "qr",
    campaign: "expcon-giveaway-oct",
    market: "all",
    destination: EXPCON,
    // The QR carries NO tags: this is the address that is printed.
    trackedUrl: EXPCON,
    shortLink: "",
    status: "draft",
    createdAt: "2026-10-01",
    printedAt: null,
    origin: "seed",
    notes:
      "Booth #9 signage, eXpcon Salt Lake City, Oct 7–9 2026. The QR is only https://sell.curbio.com/expcon — no redirect, no tags. The page fills in Channel event, medium qr, campaign expcon-giveaway-oct and the eXp referral itself. Print files: docs/expcon/qr/ (level-H QR; scan-checked). Goes to print after the production test passes — set status to printed then. The printed-direct warning on this row is deliberate.",
  },
  expconRow("email-optin", "eXpcon 2026 · email (opt-in)", "email", "Marketing", "email", "e", "nurture-expcon-oct", undefined, "Opted-in list: nurture sends."),
  expconRow("email-cold", "eXpcon 2026 · email (cold)", "email", "Marketing", "email", "e", "cold-expcon-oct", undefined, "Cold outreach sends."),
  expconRow("linkedin", "eXpcon 2026 · Curbio LinkedIn", "social_bio", "Marketing", "organic", "social", "social-expcon-oct", "linkedin", "Curbio's own LinkedIn posts."),
  expconRow("instagram", "eXpcon 2026 · Curbio Instagram", "social_bio", "Marketing", "organic", "social", "social-expcon-oct", "instagram", "Curbio's own Instagram posts and bio."),
  expconRow("facebook", "eXpcon 2026 · Curbio Facebook", "social_bio", "Marketing", "organic", "social", "social-expcon-oct", "facebook", "Curbio's own Facebook posts."),
  expconRow("hsm-linkedin", "eXpcon 2026 · HSM personal LinkedIn", "social_bio", "HSMs", "hsm_field", "social", "social-expcon-oct", "linkedin", "For HSMs to post from their own LinkedIn. utm_source=hsm_field."),
  expconRow("paid-linkedin", "eXpcon 2026 · paid social · LinkedIn", "paid_ad", "Marketing", "paid_social", "social", "paid-expcon-oct", "linkedin", "Only if paid social is used. Swap utm_content for another platform by adding a row."),
  expconRow("paid-instagram", "eXpcon 2026 · paid social · Instagram", "paid_ad", "Marketing", "paid_social", "social", "paid-expcon-oct", "instagram", "Only if paid social is used."),
  expconRow("exp-banner", "eXpcon 2026 · /exp banner", "partner_page", "Marketing", "partnership", "collateral", "partner-expcon-oct", "exp-banner", "The dismissible bar on sell.curbio.com/exp (config/campaigns/exp.ts promoBanner). Hides itself when entries close, Oct 9 noon MT. Partnership + utm_content exp-banner keep these entries apart from the booth QR (event/qr) and the emails (email/e)."),
  expconRow("paid-facebook", "eXpcon 2026 · paid social · Facebook", "paid_ad", "Marketing", "paid_social", "social", "paid-expcon-oct", "facebook", "Only if paid social is used."),
];

export const SEED_LINKS: TrackedLink[] = [
  ...EVENT_LINKS,
  ...HSM_CARD_LINKS,
  ...(seed.rows as Omit<TrackedLink, "origin">[]).map(
    (r): TrackedLink => ({ ...r, origin: "seed" })
  ),
];
