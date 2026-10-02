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

// The eXpcon booth QR encodes the SHORT LINK and nothing else — which is why
// `trackedUrl` below is the short link too: the Links screen draws its QR from
// that field, and it must reproduce the printed code, not a different one. The
// tags are added by the WordPress redirect, so repointing after the show is a
// redirect edit and never a reprint. The row carries the campaign so leads
// tagged with it join back here.
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
    destination: "https://curbio.com/expcon",
    trackedUrl: "https://curbio.com/expcon",
    shortLink: "curbio.com/expcon",
    status: "printed",
    createdAt: "2026-10-01",
    printedAt: null,
    origin: "seed",
    notes:
      "Booth #9 signage, eXpcon Salt Lake City, Oct 7–9 2026. The QR is only https://curbio.com/expcon; the WordPress redirect (302) adds utm_source=event, utm_medium=qr, utm_campaign=expcon-giveaway-oct and referral_source_id=eXp realty, and lands on sell.curbio.com/expcon. Print files: docs/expcon/qr/. The redirect lives in WordPress — it has to be recreated at the website cutover.",
  },
];

export const SEED_LINKS: TrackedLink[] = [
  ...EVENT_LINKS,
  ...HSM_CARD_LINKS,
  ...(seed.rows as Omit<TrackedLink, "origin">[]).map(
    (r): TrackedLink => ({ ...r, origin: "seed" })
  ),
];
