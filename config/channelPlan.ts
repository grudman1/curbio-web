// ─────────────────────────────────────────────────────────────────────────────
// THE MAGNIFICENT SEVEN — the planning taxonomy.
//
// Source: the CEO memo (magnificentseven.docx) and the plan built from it
// (Curbio_Marketing_Strategy_2026.docx). Tier order is the CEO's, not
// alphabetical — the same principle that makes CHANNEL_FUNNEL_ORDER
// funnel-position rather than A–Z.
//
// THIS IS NOT lib/channels.ts. That file is the MEASUREMENT taxonomy: a closed
// nine-value list a lead can actually be tagged with at the boundary. The two
// do not map 1:1 and must not be collapsed — see DECISIONS.md → "The
// Magnificent Seven and the nine channels are different axes".
//
//   Paid explodes into three measured channels.
//   Events maps to NONE — it is attributed by campaign code.
//   Content maps to NONE — it is an input the other six spend.
//   referral and direct belong to no Magnificent Seven channel at all.
//
// Every channel here has a tier, an owner, and a target BEFORE it has a single
// lead. That is why an unwired channel screen renders a ChannelBrief — a plan
// with a scoreboard reading em-dash — rather than an EmptyState. The targets
// below are the ones that were previously buried in config/marketingHub.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Channel } from "@/lib/channels";
import {
  COST_PER_ATTENDEE_TARGET_USD,
  COST_PER_MEETING_TARGET_USD,
  OUTREACH_WEEKLY_CALLS_TARGET,
  OUTREACH_WEEKLY_MAILINGS_TARGET,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
} from "./marketingHub";

export type Tier = 1 | 2 | 3;

/** How a channel's leads get attributed. Anything other than "channel" needs
 *  to say so ON THE SCREEN — it does not work like the others. */
export type AttributionBasis = "channel" | "campaign-code" | "indirect";

export type ChannelPlan = {
  slug: string;
  /** Position(s) in the CEO memo. A list because Partnerships covers two of
   *  the memo's seven — #2 and #3 are one motion at different sizes. Kept so
   *  the memo and the nav can still be read side by side. */
  memoNumbers: number[];
  label: string;
  tier: Tier;
  owner: string;
  /** One line. Why this channel exists, from the plan. */
  purpose: string;
  /** The measured channels this planning channel covers. EMPTY is meaningful,
   *  not missing — see `basis`. */
  channels: Channel[];
  basis: AttributionBasis;
  /** Shown when basis !== "channel". The honest disclaimer. */
  basisNote?: string;
  /** The numbers this channel is held to. */
  targets: { label: string; value: string }[];
  /** What must exist before this screen can show a real number. */
  needs: string[];
};

const TIER_WHY: Record<Tier, string> = {
  1: "Carries the number — highest volume and leverage; one win can supply a market's entire 50.",
  2: "Fast compounding — paid lifts conversion across every other channel; organic is the compounding asset.",
  3: "Builds the engine — feeds all six above.",
};

export function tierWhy(tier: Tier): string {
  return TIER_WHY[tier];
}

export const CHANNEL_PLAN: ChannelPlan[] = [
  {
    slug: "email",
    memoNumbers: [1],
    label: "Email",
    tier: 1,
    owner: "Gavin / Levi",
    purpose:
      "The primary engine. Opt-in and cold are separated so cold can get more aggressive without risking opt-in deliverability.",
    channels: ["email"],
    basis: "channel",
    targets: [
      { label: "Qualified per market per month", value: String(QUALIFIED_TARGET_PER_MARKET_PER_MONTH) },
      { label: "Cold list size", value: "~100k names — unconfirmed" },
    ],
    needs: [
      "ActiveCampaign webhook (opt-in sends and replies)",
      "Instantly webhook (cold sends and positive replies)",
      "Opt-in domain warmed and the opt-in list recompiled",
      "Deliverability monitoring per domain",
    ],
  },
  {
    slug: "partnerships",
    // ONE motion at different sizes. The CEO memo lists brokerages (#2) and
    // super agents / teams / single-location shops (#3) separately, but both
    // end in the same event: a booked meeting with one decision-maker who
    // brings a book of agents. Split across two screens they compete for the
    // same weekly HSM time and get scored on two cards for one number.
    //
    // The merge keeps BOTH measured channels and BOTH targets. Collapsing
    // those too would lose the enterprise motion's economics, which is the
    // part with an actual cost attached.
    memoNumbers: [2, 3],
    label: "Partnerships",
    tier: 1,
    owner: "Aaron / Gavin / Levi / HSMs",
    purpose:
      "One relationship, one meeting, one decision-maker with a book of agents — from a national brokerage down to a single-location shop. HSMs close MEETINGS, not quotes.",
    channels: ["partnership", "hsm_field"],
    basis: "channel",
    targets: [
      { label: "Cost per meeting", value: `$${COST_PER_MEETING_TARGET_USD}` },
      { label: "Weekly per HSM", value: `${OUTREACH_WEEKLY_MAILINGS_TARGET} mailings · ${OUTREACH_WEEKLY_CALLS_TARGET} calls` },
      { label: "Marketing fee (proposed)", value: "$100 per proposal — pending Adam" },
    ],
    needs: [
      "Partner record store (stage, owner, next step, next step date)",
      "Brokerage list pulled from the App + Becca's signed agreements",
      "Mailing log (who, which arm, when) per HSM",
      "Meeting-booked events attributable to an arm",
      "Partner-page inquiry events flowing from /api/intake",
      "Per-partner campaign codes so blast traffic is not `direct`",
      "Spend entry for card cost (the $15 Starbucks arm)",
    ],
  },
  {
    slug: "paid",
    memoNumbers: [4],
    label: "Paid",
    tier: 2,
    owner: "Gavin (+ agency)",
    purpose:
      "Cheapest at low volume and lifts conversion across every other channel — which is the real argument for it.",
    // THREE measured channels. Search and social are agency-run; creator is
    // pay-per-qualified-lead with a compliance guardrail and behaves nothing
    // like the other two, so the screen breaks all three out.
    channels: ["paid_search", "paid_social", "creator"],
    basis: "channel",
    targets: [
      { label: "Starting spend", value: "~$2k / month" },
      { label: "Creator payout", value: "~$50+ per valid in-market SQL" },
    ],
    needs: [
      "Agency selected, or the decision to run in-house",
      "Spend store (month × market × channel × amount)",
      "Per-creator tracking dashboard before any creator dollar goes out",
      "Written payable-lead definition and a compliance guardrail",
    ],
  },
  {
    slug: "organic",
    memoNumbers: [5],
    label: "Organic",
    tier: 2,
    owner: "Gavin",
    purpose:
      "The compounding asset the website rebuild directly serves — site, landing pages, local SEO, reviews.",
    channels: ["organic"],
    basis: "channel",
    targets: [{ label: "Landing page conversion", value: "~10% (sell.curbio.com baseline)" }],
    needs: [
      "curbio.com cutover off WordPress",
      "Local SEO per market",
      "Customer reviews as an explicit program",
    ],
  },
  {
    slug: "events",
    memoNumbers: [6],
    label: "Events",
    tier: 3,
    owner: "Gavin / HSMs",
    purpose:
      "The strongest CTA for engagement. Webinar registration is also a clean opt-in source for the new domain.",
    // No channel value exists for events, and that is the honest state: an
    // event lead is identified by its CAMPAIGN CODE. Without call tracking and
    // per-event codes every one of them lands as `direct` and the channel
    // looks worthless.
    channels: [],
    basis: "campaign-code",
    basisNote:
      "Attributed by campaign code, not channel. Without call tracking and per-event codes, event leads land as direct.",
    targets: [{ label: "Cost per attendee", value: `$${COST_PER_ATTENDEE_TARGET_USD}` }],
    needs: [
      "Event log store (format, date, market, invited/registered/attended)",
      "event_rsvp submissions from /api/intake",
      "Call tracking numbers per event",
      "Spend entry per event",
    ],
  },
  {
    slug: "content",
    memoNumbers: [7],
    label: "Content",
    tier: 3,
    owner: "Gavin / freelancers",
    purpose:
      "The raw material every other channel spends. Messaging platform first, then subject and form.",
    // Content produces no leads OF ITS OWN — it is an input. Its row exists
    // because the CEO wrote seven, and a dashboard showing six invites "where
    // did the seventh go?" at every monthly review.
    channels: [],
    basis: "indirect",
    basisNote:
      "Measured on other channels' screens. Content has no leads of its own — it is the raw material the other six spend.",
    targets: [{ label: "Newsletter", value: "monthly, once the messaging platform exists" }],
    needs: [
      "Messaging platform / USP written down",
      "Content calendar and freelancer pipeline",
      "Monthly newsletter shipping",
    ],
  },
];

export const CHANNEL_PLAN_BY_SLUG: Record<string, ChannelPlan> = Object.fromEntries(
  CHANNEL_PLAN.map((c) => [c.slug, c])
);

// Compile-time guard: every MEASURED channel that a Magnificent Seven channel
// claims must exist in the closed nine-value list. Catches a typo turning into
// a phantom channel — the exact failure lib/channels.ts exists to prevent.
type ClaimedChannel = (typeof CHANNEL_PLAN)[number]["channels"][number];
const _claimedAreReal: ClaimedChannel extends Channel ? true : never = true;
void _claimedAreReal;
