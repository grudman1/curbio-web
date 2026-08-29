// ─────────────────────────────────────────────────────────────────────────────
// REFERRAL-SOURCE BACKFILL MAPPING — Attribution Spec v3.2 §8.
//
// The one-time backfill of legacy records maps the ReferralSource junk drawer
// (www.curbio.com, Phone Call, landing page, Other, lonewolf, Inbound Email,
// partner labels, page URLs) onto the ten-value channel model. This file is
// the ONLY place that inference lives — no per-lead edits, ever. A lead whose
// channel came from this mapping is marked `attribution: "inferred"`; a lead
// carrying a real UTM signal keeps `attribution: "measured"` and this mapping
// NEVER overrides it (real UTMs always win — the mapping only fills blanks).
//
// Spec rules encoded here:
//   §3b  ReferralSourceId is verbatim, never normalised. It passes through on
//        every imported row untouched; this table keys on it but never edits
//        it. A partner ReferralSourceId derives channel = partnership with
//        campaign = the partner name — unless a stronger real UTM signal
//        exists on the row.
//   §3c  Channel ≠ entryPoint. Channel is the funded motion; entryPoint
//        (CRM: Origin) is the door. Both are backfilled, independently.
//   §4   Absent or unknown utm_source → direct. Direct is honestly read as
//        "unattributed" — never minted into organic (§9, dark traffic).
//   §5b  No call tracking exists, so a phone lead's DOOR is known (phone) but
//        its channel honestly is not → direct.
//
// utm_campaign and utm_content are NEVER inferred by this mapping — they stay
// blank unless real data exists or the Mailchimp date-correlation pass
// (scripts/import-app-snapshot.ts) assigns one. First-touch fields
// (LeadSource / FirstTouchCampaign) are never fabricated: no cookies existed
// for these leads, so first-touch absence is the true state.
//
// When the live API connection lands, imported records are superseded by API
// data keyed on Deal ID, and this mapping retires with them.
// ─────────────────────────────────────────────────────────────────────────────

import type { Channel } from "@/lib/channels";

export const BACKFILL_MAPPING_VERSION = "1.0.0" as const;

/** How the channel on an imported lead came to be. */
export type AttributionQuality =
  /** Real UTM data captured at submission — the web door working. */
  | "measured"
  /** Channel filled by this mapping from the referral source. */
  | "inferred"
  /** Campaign assigned by the Mailchimp send-date correlation pass. */
  | "inferred-by-date";

export type BackfillEntry = {
  channel: Channel;
  /** The door (CRM: Origin). Independent of channel — spec §3c. */
  entryPoint: "web_form" | "phone" | "manual" | "inbound_email";
  utm_source?: string;
  utm_medium?: string;
  /** partnership only: campaign = partner name, verbatim (spec §3b). */
  utm_campaign?: string;
  landing_page_url?: string;
  /** high — confident mapping; low — flagged for reclassification.
   *  `spec` marks entries where `direct` IS the confident, honest answer
   *  (dark traffic / unknown channel), not a shrug. */
  confidence: "high" | "low" | "spec";
  /** Why this entry maps the way it does — shown in review, never rendered
   *  as data. */
  note?: string;
};

/**
 * Referral source (as exported by app.curbio.com, matched case-insensitively
 * after trimming) → backfill values. Sources absent from this table fall to
 * DEFAULT_BACKFILL below — direct/web_form, per spec §4.
 */
export const REFERRAL_BACKFILL: Record<string, BackfillEntry> = {
  // ── Email program ──────────────────────────────────────────────────────────
  // "landing page" is the server-side referralSourceId fallback written by the
  // web door (spec v3.2 change log) — those leads arrived via tagged links,
  // overwhelmingly the Mailchimp warm-up program, on sell.curbio.com pages.
  "landing page": {
    channel: "email",
    entryPoint: "web_form",
    utm_source: "mailchimp",
    utm_medium: "e",
    landing_page_url: "sell.curbio.com/lp/sell?market={market}",
    confidence: "high",
  },
  "inbound email": {
    channel: "email",
    entryPoint: "inbound_email",
    utm_source: "mailchimp",
    utm_medium: "e",
    confidence: "high",
    note: "Spec §5d: inbound email-reply door — channel email, door inbound_email.",
  },

  // ── Phone ──────────────────────────────────────────────────────────────────
  "phone call": {
    channel: "direct",
    entryPoint: "phone",
    confidence: "spec",
    note:
      "Door known; channel honestly unknown — no call tracking exists (spec §5b). " +
      "Never minted into a channel.",
  },

  // ── Partnerships (spec §3b: campaign = partner name, verbatim) ────────────
  "long&fosterlift": {
    channel: "partnership",
    entryPoint: "web_form",
    utm_campaign: "Long&FosterLift",
    landing_page_url: "go.curbio.com/longandfoster",
    confidence: "high",
  },
  kwofferings: {
    channel: "partnership",
    entryPoint: "web_form",
    utm_campaign: "KWOfferings",
    landing_page_url: "go.curbio.com/kwofferings",
    confidence: "high",
  },
  "e&velevate": {
    channel: "partnership",
    entryPoint: "web_form",
    utm_campaign: "E&VElevate",
    landing_page_url: "go.curbio.com/evatlanta",
    confidence: "high",
  },
  exp: {
    channel: "partnership",
    entryPoint: "web_form",
    utm_campaign: "Exp",
    landing_page_url: "sell.curbio.com/exp",
    confidence: "high",
    note: "Likely entry: Get Started on solutions.exprealty.com.",
  },
  "exp realty": {
    channel: "partnership",
    entryPoint: "web_form",
    utm_campaign: "eXp realty",
    landing_page_url: "sell.curbio.com/exp",
    confidence: "high",
    note: "Likely entry: Get Started on solutions.exprealty.com.",
  },
  lonewolf: {
    channel: "partnership",
    entryPoint: "web_form",
    utm_campaign: "lonewolf",
    confidence: "low",
    note: "FLAGGED FOR RECLASSIFICATION — origin unknown; landing page unknown.",
  },

  // ── Dark traffic — surface preserved, channel not minted (spec §4/§9) ─────
  "www.curbio.com": {
    channel: "direct",
    entryPoint: "web_form",
    landing_page_url: "www.curbio.com",
    confidence: "spec",
  },
  "curbio.com/atlanta": darkPage("curbio.com/atlanta"),
  "curbio.com/dallas": darkPage("curbio.com/dallas"),
  "curbio.com/nova": darkPage("curbio.com/nova"),
  "curbio.com/maryland": darkPage("curbio.com/maryland"),
  "curbio.com/seattle": darkPage("curbio.com/seattle"),
  "curbio.com/losangeles": darkPage("curbio.com/losangeles"),
  "curbio.com/dc": darkPage("curbio.com/dc"),
  "curbio.com/agents": darkPage("curbio.com/agents"),
  atlantalp: darkPage("curbioatlanta.com"),
  houstonlp: darkPage("curbiohouston.com"),
  sandiegolp: darkPage("curbiosandiego.com"),
  losangeleslp: darkPage("curbiolosangeles.com"),

  // ── Not channels ──────────────────────────────────────────────────────────
  nar: { channel: "direct", entryPoint: "web_form", confidence: "spec" },
  other: {
    channel: "direct",
    entryPoint: "web_form",
    confidence: "spec",
    note: "Catch-all, not a channel. Spec §8: kill OTHER as a resting state going forward.",
  },
};

/** A curbio.com page URL in the referral field: the surface is real and worth
 *  keeping, but the channel that drove the visit is unknown — direct, per
 *  spec §4/§9. The URL is preserved; a channel is not minted from it. */
function darkPage(url: string): BackfillEntry {
  return { channel: "direct", entryPoint: "web_form", landing_page_url: url, confidence: "spec" };
}

/** Blank / None / anything unrecognised → direct via the web-form door.
 *  Spec §4: absent or unknown source is honestly unattributed. */
export const DEFAULT_BACKFILL: BackfillEntry = {
  channel: "direct",
  entryPoint: "web_form",
  confidence: "spec",
};

/** Look up the backfill entry for a raw referral source. Case-insensitive,
 *  trimmed; "Landing Page" and "landing page" are one entry. Never returns
 *  null — the default IS the spec's answer for the unknown. */
export function backfillForReferralSource(raw: string | null | undefined): BackfillEntry {
  const key = (raw ?? "").trim().toLowerCase();
  if (!key) return DEFAULT_BACKFILL;
  return REFERRAL_BACKFILL[key] ?? DEFAULT_BACKFILL;
}
