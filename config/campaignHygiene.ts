// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN TAG HYGIENE — which tags deserve documentation, and which are noise.
//
// The Links registry's orphan check compares campaign tags seen in real lead
// traffic against documented rows. It was demanding documentation for 23 tags,
// over half of which were QA artifacts from our own testing — so the number
// was mostly self-inflicted, and a list that is mostly noise gets ignored,
// which is worse than no list.
//
// Two rules live here, both deliberately conservative:
//
//   isTestCampaignTag  — a tag this codebase's own testing produced. Excluded
//     from the orphan count entirely: nobody should document a test. The
//     patterns are exact prefixes we actually used, not a fuzzy "contains
//     test" sweep, because a real campaign could legitimately be named
//     "latest-listings" or "contest-jul".
//
//   inferChannelForCampaign — the fallback when observed lead rows carry no
//     channel of their own. Name shape only, and every caller records that
//     the value was inferred rather than measured.
// ─────────────────────────────────────────────────────────────────────────────

import type { Channel } from "@/lib/channels";

/** Tag prefixes produced by our own QA runs. Anchored: a genuine campaign
 *  starting with these words does not exist, and an unanchored match would
 *  swallow real ones. */
export const TEST_CAMPAIGN_PATTERNS: readonly RegExp[] = [
  /^testcampaign(-|$)/i,
  /^phase\d+-/i,
  /^qa-/i,
  /^smoke-/i,
  /^e2e-/i,
];

/** True when the tag is a QA artifact rather than a campaign anyone ran. */
export function isTestCampaignTag(tag: string): boolean {
  const t = tag.trim();
  return TEST_CAMPAIGN_PATTERNS.some((re) => re.test(t));
}

/** A tag whose market token was never substituted — the link was built from a
 *  template and shipped with the placeholder intact ("MARKET-jun26"). Real
 *  traffic, real leads, but the tag cannot say which market it ran in. Worth
 *  surfacing on review rather than quietly documenting as if it were fine. */
export function isUnsubstitutedPlaceholder(tag: string): boolean {
  return /(^|-)(MARKET|CITY|REGION|MARKETNAME)(-|$)/.test(tag.trim());
}

/** Last-resort channel guess from the tag's shape, used only when no observed
 *  lead on the tag carries a channel. Callers must mark the result inferred.
 *  Order matters: the first match wins. */
const NAME_SHAPE_RULES: readonly { test: RegExp; channel: Channel; why: string }[] = [
  { test: /^bizcard-|(-|^)card(-|$)/i, channel: "hsm_field", why: "business-card tag" },
  { test: /(-|^)(qr|flyer|postcard|doorhanger|print)(-|$)/i, channel: "hsm_field", why: "printed asset" },
  { test: /(-|^)(event|expo|summit|conference|booth)(-|$)/i, channel: "event", why: "event tag" },
  { test: /(-|^)(fb|ig|instagram|facebook|linkedin|social)(-|$)/i, channel: "paid_social", why: "social tag" },
  { test: /(-|^)(ppc|sem|gads|google)(-|$)/i, channel: "paid_search", why: "paid-search tag" },
];

/** Month-suffixed tags ("honestly-jul", "3changes-aug") are the email
 *  program's naming convention — that is the shape the Mailchimp sends use. */
const EMAIL_MONTH_SUFFIX = /-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\d{0,2}$/i;

export function inferChannelForCampaign(tag: string): { channel: Channel; why: string } {
  for (const rule of NAME_SHAPE_RULES) {
    if (rule.test.test(tag)) return { channel: rule.channel, why: rule.why };
  }
  if (EMAIL_MONTH_SUFFIX.test(tag)) {
    return { channel: "email", why: "month-suffixed — the email program's naming convention" };
  }
  // Honest default: unknown shape is not evidence of a channel.
  return { channel: "direct", why: "no signal in the tag — needs a human" };
}
