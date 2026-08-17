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

export const SEED_LINKS: TrackedLink[] = [
  ...HSM_CARD_LINKS,
  ...(seed.rows as Omit<TrackedLink, "origin">[]).map(
    (r): TrackedLink => ({ ...r, origin: "seed" })
  ),
];
