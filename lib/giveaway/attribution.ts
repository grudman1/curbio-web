import { deriveChannel } from "../channels";
import type { EntryAttribution } from "./entry";

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTION for a giveaway entry — one pure function, so the rules can be
// checked by a plain `node` script (scripts/test-giveaway-attribution.mjs) with
// no build and no network. NO PATH ALIASES in this file, for that reason.
//
// The rules (Attribution Spec v3.3, as decided for eXpcon 2026-10-02):
//
//   1. NO TAG (a QR scan, someone typing the address): the page's full defaults
//      — Channel event, utm_source event, utm_medium qr, utm_campaign
//      expcon-giveaway-oct. Blank counts as absent: `?utm_source=` must not
//      beat the default.
//   2. REAL TAGS ALWAYS WIN over the page's channel and campaign defaults. A
//      visitor with a real utm_source keeps their own medium and campaign, even
//      if those are empty, rather than being given half of ours.
//   3. THE eXp REFERRAL IS NEVER OPTIONAL. Every entry carries the page's
//      referral source ("eXp realty") whatever the URL says, because this page
//      is only promoted to eXp agents. A `referral_source_id` in the URL is
//      ignored, not trusted: it cannot remove the referral or change it.
//   4. First touch is the browser's earlier record if it has one (write-once,
//      and only ever written on a tagged arrival); otherwise THIS submission's
//      channel and campaign — computed at send time, written nowhere but the
//      entry, never to the visitor's browser (AGENTS.md, rule 2).
//
// The channel is derived from utm_source against the closed list in
// lib/channels.ts, so an unknown source lands as "direct" rather than minting a
// channel.
// ─────────────────────────────────────────────────────────────────────────────

/** Cap for free-text attribution values. Mirrors MAX_TAG in ./entry (which this
 *  file cannot import: it uses path aliases). */
export const MAX_TAG = 200;

/** A non-empty string, trimmed and capped — or null. */
export function trimmed(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, MAX_TAG) : null;
}

/** The slice of a giveaway's settings this needs. */
export type AttributionSettings = {
  attribution: {
    referralSourceId: string;
    defaults: { utm_source: string; utm_medium: string; utm_campaign: string };
  };
};

export function attributionFrom(body: Record<string, unknown>, giveaway: AttributionSettings): EntryAttribution {
  const d = giveaway.attribution.defaults;
  const supplied = trimmed(body.utm_source);
  const defaulted = supplied === null;

  const utm_source = supplied ?? d.utm_source;
  const utm_medium = defaulted ? d.utm_medium : trimmed(body.utm_medium);
  const utm_campaign = defaulted ? d.utm_campaign : trimmed(body.utm_campaign);
  const channel = deriveChannel(utm_source);

  const firstTouchChannel = trimmed(body.firstTouchChannel);
  return {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content: trimmed(body.utm_content),
    utm_term: trimmed(body.utm_term),
    channel,
    referralSourceId: giveaway.attribution.referralSourceId,
    entryPoint: "web_form",
    firstTouchChannel: firstTouchChannel ?? channel,
    firstTouchCampaign: firstTouchChannel ? trimmed(body.firstTouchCampaign) : utm_campaign,
    defaulted,
  };
}
