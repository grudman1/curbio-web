// ─────────────────────────────────────────────────────────────────────────────
// The Links registry's domain model — every tracked link Curbio has in the
// world, one row each. Types and RULES live here (client and server both
// import this file); storage lives in lib/marketingLinksStore.ts; the seed
// from the WordPress redirect export lives in config/linkRegistry.ts.
//
// The two rules this module encodes:
//   1. Anything printed points at a redirect we control. A QR or print row
//      whose destination is sell.curbio.com directly is flagged: printed
//      links are permanent — that one cannot be repointed if the page moves.
//   2. Printed is a locked state. Once printed, the tracked URL only changes
//      with an explicit "the physical asset is being reprinted" confirmation
//      — the paper in someone's wallet is the source of truth.
// ─────────────────────────────────────────────────────────────────────────────

import type { Channel } from "./channels";

export const LINK_TYPES = [
  { key: "qr", label: "QR" },
  { key: "print", label: "Print" },
  { key: "email", label: "Email" },
  { key: "partner_page", label: "Partner page" },
  { key: "social_bio", label: "Social bio" },
  { key: "paid_ad", label: "Paid ad" },
  { key: "signature", label: "Signature" },
  // Imported vanity redirects that predate the registry — real links in the
  // world whose purpose hasn't been classified yet.
  { key: "redirect", label: "Vanity redirect" },
  // A campaign tag observed in lead traffic with no registry row behind it.
  // The link is demonstrably real; what kind of link it is, nobody has said.
  { key: "unclassified", label: "Unclassified" },
] as const;
export type LinkType = (typeof LINK_TYPES)[number]["key"];

export const LINK_STATUSES = ["draft", "live", "printed", "retired"] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export type TrackedLink = {
  id: string;
  /** Human name — "Trevor Laramee · business card QR". */
  label: string;
  type: LinkType;
  /** HSM name, Levi, a partner, Marketing — or "unknown" (seed rows). */
  owner: string;
  channel: Channel;
  /** The raw utm_source found on an imported target, kept for audit. */
  rawUtmSource?: string | null;
  medium: string;
  campaign: string;
  /** Market slug, or "all". */
  market: string;
  /** Where it actually lands. */
  destination: string;
  /** Full assembled URL. */
  trackedUrl: string;
  /** The curbio.com/... or go.curbio.com/... redirect, if any. */
  shortLink: string;
  status: LinkStatus;
  notes?: string;
  /** ISO date, null when unknown (imports carry no creation date). */
  createdAt: string | null;
  printedAt?: string | null;
  /** Lifetime hits from the redirect export — NOT 30-day clicks. */
  lifetimeHits?: number;
  /** seed = imported inventory; registry = created here. */
  /** seed = imported inventory; registry = created here; auto = derived from
   *  observed lead traffic and awaiting review (see lib/campaignAutoDoc.ts). */
  origin: "seed" | "registry" | "auto";
};

// ── campaign validation ──────────────────────────────────────────────────────

const CAMPAIGN_RE = /^[a-z0-9]+(-[a-z0-9]+)+$/;

/** Null when valid. The message says WHY, plainly. */
export function campaignError(v: string): string | null {
  if (!v) return "campaign is required — an untagged link is how leads end up unattributed";
  if (/[A-Z]/.test(v)) return "lowercase only — Sept-Toolkit and sept-toolkit would report as two campaigns";
  if (/\s/.test(v)) return "no spaces — use hyphens";
  if (!CAMPAIGN_RE.test(v))
    return "format is [descriptor]-[market-or-date] — lowercase, hyphens only, at least two parts (e.g. sept-toolkit-atlanta)";
  return null;
}

// ── the printed-permanence rule ──────────────────────────────────────────────

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** True when a printed/QR asset points straight at sell.curbio.com instead of
 *  a redirect we control — permanent ink aimed at a movable page. */
export function printedDirectRisk(link: Pick<TrackedLink, "type" | "status" | "destination">): boolean {
  const printedish = link.type === "qr" || link.type === "print" || link.status === "printed";
  if (!printedish) return false;
  return hostOf(link.destination) === "sell.curbio.com";
}

/** True when the destination is a WordPress page that may not survive the
 *  website migration — the seed's "will this link still work" flag. */
export function migrationRisk(link: Pick<TrackedLink, "destination">): boolean {
  const host = hostOf(link.destination);
  if (host !== "curbio.com") return false;
  try {
    const path = new URL(link.destination).pathname;
    return path !== "/" && path !== "";
  } catch {
    return false;
  }
}

// ── URL assembly (the builder's live preview and the saved trackedUrl) ───────

export function assembleTrackedUrl(
  destination: string,
  channel: string,
  medium: string,
  campaign: string
): string | null {
  try {
    const url = new URL(destination);
    if (channel) url.searchParams.set("utm_source", channel);
    if (medium) url.searchParams.set("utm_medium", medium);
    if (campaign) url.searchParams.set("utm_campaign", campaign);
    return url.toString();
  } catch {
    return null;
  }
}
