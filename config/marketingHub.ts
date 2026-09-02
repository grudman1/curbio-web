// ─────────────────────────────────────────────────────────────────────────────
// MARKETING HUB — single source of truth for the /marketing surfaces.
//
// This file defines the sidebar, the reporting dimensions, the two-tier lead
// vocabulary, and the wiring registry. Pages render FROM this config; nothing
// in the Hub writes a dimension, target, or definition down twice.
//
// Nothing under the public site tiers imports from this file. The Hub is
// reporting; a reporting bug must never be able to break a landing page.
//
// ── The two-tier lead vocabulary ─────────────────────────────────────────────
//
// QUALIFIED — a request for an estimate. All estimate requests, nothing else.
// This is the SQL, the unit of the 50-per-market-per-month target, and the
// only thing the word "qualified" ever means in this Hub.
//
// ENGAGED — every other hand-raise: toolkit download, webinar registration,
// newsletter signup, coupon claim, cold-email positive reply, partner-page
// inquiry, event RSVP. Counted, tracked, and reported — as the leading
// indicator that predicts future Qualified — but NEVER included in a
// Qualified number, never counted toward the 50.
//
// The failure mode this guards against broke reporting before: form-fills
// masquerading as sales-ready leads. Engagements are real and they matter;
// they are just a different thing. Any surface that shows one must not be
// mistakable for the other.
// ─────────────────────────────────────────────────────────────────────────────

import { VALID_CHANNELS, type Channel } from "@/lib/channels";

// ── Definitions, rendered as prose wherever either metric appears ────────────

export const QUALIFIED_DEFINITION =
  "Qualified = estimate requests only. This is the unit of the 50-per-market-per-month target.";

export const ENGAGED_DEFINITION =
  "Engaged = all other hand-raises (toolkits, webinars, newsletters, replies); " +
  "they never count toward Qualified or the 50 target.";

/** The one-line version pages show under their numbers. */
export const DEFINITIONS_LINE =
  "Qualified = estimate requests only. Engaged = all other hand-raises " +
  "(toolkits, webinars, newsletters, replies); they never count toward " +
  "Qualified or the 50 target.";

// ── Targets ──────────────────────────────────────────────────────────────────

export const QUALIFIED_TARGET_PER_MARKET_PER_MONTH = 50;
export const COST_PER_MEETING_TARGET_USD = 150;
export const COST_PER_ATTENDEE_TARGET_USD = 25;
export const OUTREACH_WEEKLY_MAILINGS_TARGET = 10;
export const OUTREACH_WEEKLY_CALLS_TARGET = 10;

// ── Reporting dimensions ─────────────────────────────────────────────────────

/**
 * The ten channels in FUNNEL-POSITION order — how far from the close the
 * channel sits, not the alphabet. Direct last. This is an ORDERING of the
 * closed list in lib/channels.ts, never an extension of it: every entry is
 * type-checked against Channel, and the exhaustiveness check below fails the
 * build if lib/channels.ts ever adds a value this ordering doesn't place.
 */
export const CHANNEL_FUNNEL_ORDER = [
  "creator",
  "event",
  "partnership",
  "hsm_field",
  "email",
  "paid_search",
  "paid_social",
  "organic",
  "referral",
  "direct",
] as const satisfies readonly Channel[];

// Compile-time exhaustiveness: every valid channel appears in the ordering.
type MissingFromFunnelOrder = Exclude<Channel, (typeof CHANNEL_FUNNEL_ORDER)[number]>;
const _channelOrderIsComplete: MissingFromFunnelOrder extends never ? true : never = true;
void _channelOrderIsComplete;
void VALID_CHANNELS;

export const CHANNEL_LABELS: Record<Channel, string> = {
  creator: "Creator",
  event: "Event",
  partnership: "Partnership",
  hsm_field: "HSM field",
  email: "Email",
  paid_search: "Paid search",
  paid_social: "Paid social",
  organic: "Organic",
  referral: "Referral",
  direct: "Direct",
};

/**
 * The email split is a VIEW, resolved from which webhook the event came from.
 * It is not an eleventh channel — the CRM list is closed at ten and validated at
 * the boundary; a new value maps straight back to `direct`.
 */
export const EMAIL_SPLIT_VIEWS = [
  { key: "email_opt_in", label: "Email · opt-in", resolvedFrom: "ActiveCampaign webhook" },
  { key: "email_cold", label: "Email · cold", resolvedFrom: "Instantly webhook" },
] as const;

export const REPORT_METRICS = [
  { key: "engaged", label: "Engaged" },
  { key: "qualified", label: "Qualified" },
  { key: "closed", label: "Closed" },
  { key: "revenue", label: "Revenue" },
  { key: "close_rate", label: "Close rate" },
  { key: "cac", label: "CAC" },
] as const;
export type ReportMetricKey = (typeof REPORT_METRICS)[number]["key"];

export const ATTRIBUTION_MODES = [
  { key: "last", label: "Last touch" },
  { key: "first", label: "First touch" },
] as const;
export type AttributionMode = (typeof ATTRIBUTION_MODES)[number]["key"];

export const ROW_DIMENSIONS = [
  { key: "market", label: "By market" },
  { key: "hsm", label: "By HSM" },
] as const;
export type RowDimension = (typeof ROW_DIMENSIONS)[number]["key"];

/** The six-stage funnel, in order. Lead first, Closed last. */
export const FUNNEL_STAGES = [
  "Lead",
  "Spoke with agent",
  "Meeting scheduled",
  "Walkthrough done",
  "Proposal sent",
  "Closed",
] as const;

// ── Contacts ─────────────────────────────────────────────────────────────────

export const CONTACT_STATUSES = [
  "cold",
  "engaged",
  "opted_in",
  "rfq",
  "customer",
  "unsubscribed",
] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

/** The graduation rule, stated on the Contacts page. */
export const COLD_GRADUATION_RULE =
  "A contact leaves cold only when they reply positively, claim a CTA, or " +
  "submit a form. Nothing else graduates a contact.";

// ── Forms ────────────────────────────────────────────────────────────────────

/**
 * Every Engaged conversion is counted on the Forms page, by these types.
 * `estimate` is NOT a form type here and never will be — estimates go to the
 * app and appear in the Hub only as Qualified numbers synced back from it.
 */
export const FORM_TYPES = [
  "toolkit",
  "webinar",
  "coupon_claim",
  "newsletter",
  "partner_inquiry",
  "event_rsvp",
  "personal_analysis",
  "other",
] as const;
export type FormType = (typeof FORM_TYPES)[number];

// ── Events ───────────────────────────────────────────────────────────────────

export const EVENT_FORMATS = ["webinar", "breakfast", "happy_hour", "association"] as const;
export type EventFormat = (typeof EVENT_FORMATS)[number];

// ── Partners (real relationships, names only — no numbers) ──────────────────

export const PARTNER_SEED = [
  { name: "eXp", stage: "national, live partner page" },
  { name: "BHHS Georgia", stage: "signed, dormant" },
  { name: "Re/Max Gold", stage: "warm, transferring" },
  { name: "New Millennium", stage: "Baltimore, no formal agreement" },
] as const;

// ── Outreach A/B ─────────────────────────────────────────────────────────────

export const OUTREACH_ARMS = [
  { key: "starbucks", label: "$15 Starbucks card" },
  { key: "plain", label: "Plain email" },
] as const;

// ── Sync / webhook surfaces (Settings health table) ──────────────────────────

export const SYNC_SURFACES: {
  key: string;
  label: string;
  carries: string;
  status: WiringStatus;
  note?: string;
}[] = [
  {
    key: "app_sync",
    label: "App sync",
    carries: "Qualified, funnel stages, Closed, Revenue",
    status: "partial",
    note: "one-time snapshot in place (config/appLeadsSnapshot.json) — not a live sync; re-run scripts/import-app-leads.mjs to refresh",
  },
  { key: "activecampaign", label: "ActiveCampaign", carries: "opt-in email events, newsletter signups", status: "waiting" },
  { key: "instantly", label: "Instantly", carries: "cold-email sends and positive replies", status: "waiting" },
  { key: "intake", label: "/api/intake", carries: "form submissions (all Engaged types)", status: "waiting" },
];

// ── Wiring registry ──────────────────────────────────────────────────────────
//
// Each surface declares its purpose, a status, and the list of things that
// must exist before it can show real numbers. This registry drives the status
// dot beside each sub-nav item and the "Not wired yet — needs" block on each
// page. While the Hub is unwired, the nav IS the build tracker.

export type WiringStatus = "live" | "partial" | "waiting";

export type HubSurface = {
  /** Route segment under /marketing ("today" is the root). */
  slug: string;
  label: string;
  /** One-line purpose, rendered in the page header. */
  purpose: string;
  /** Target line where one exists. */
  target?: string;
  status: WiringStatus;
  /** Blockers, in build order — this list is the build plan for the page. */
  needs: string[];
};

export const HUB_SURFACES: HubSurface[] = [
  {
    slug: "today",
    label: "Today",
    purpose:
      "Are we on pace to hit 50 Qualified per market this month — and if not, where is it breaking?",
    target: `${QUALIFIED_TARGET_PER_MARKET_PER_MONTH} Qualified per market per month`,
    status: "partial",
    needs: [
      "Live app sync — interim: the app snapshot (config/appLeadsSnapshot.json), accurate through its as-of date",
      "Engaged sources (ActiveCampaign, Instantly, /api/intake) before the funnel's Engaged stage can show a number",
      "Webhook heartbeats, so the alerts panel can catch a sync going silent",
    ],
  },
  {
    slug: "report",
    label: "Report",
    purpose:
      "Markets or HSMs × the ten channels, one metric at a time — the operating view of what is producing Qualified leads.",
    target: `${QUALIFIED_TARGET_PER_MARKET_PER_MONTH} Qualified per market per month`,
    status: "partial",
    needs: [
      "Live app sync for Qualified, funnel stages, Closed, and Revenue — interim: one-time PII-stripped snapshot (config/appLeadsSnapshot.json); accurate through its as-of date, drifts after",
      "Contact store with channel attribution (first and last touch — the app's first-touch fields are empty, so first-touch views stay em-dash)",
      "Spend entry per month × market × channel (for CAC)",
      "ActiveCampaign and Instantly webhooks (for Engaged and the email opt-in / cold split)",
    ],
  },
  {
    slug: "channels",
    label: "Channels",
    purpose:
      "One channel at a time, across markets and months — what is producing, what has gone quiet, and what each Qualified costs.",
    status: "partial",
    needs: [
      "Live app sync — interim: the app snapshot, last-touch only",
      "Spend entry per month × market × channel (for cost per Qualified)",
      "ActiveCampaign and Instantly webhooks (for Engaged by channel)",
    ],
  },
  {
    slug: "markets",
    label: "Markets",
    purpose:
      "One market at a time — trajectory against the 50, channel mix, and where its funnel narrows.",
    target: `${QUALIFIED_TARGET_PER_MARKET_PER_MONTH} Qualified per market per month`,
    status: "partial",
    needs: [
      "Live app sync — interim: the app snapshot",
      "Spend entry per month × market (for CAC by market)",
    ],
  },
  {
    slug: "attribution",
    label: "Attribution health",
    purpose:
      "What share of Qualified arrives with no known channel. Shrinking that number is the job — every other page is only as good as this one.",
    status: "partial",
    needs: [
      "UTM discipline on every link in the wild — the Links registry is the tool for this",
      "Call tracking numbers per market and event (phone leads land as direct without them)",
      "First-touch capture (the app's first-touch fields are empty today)",
    ],
  },
  {
    slug: "links",
    label: "Links",
    purpose:
      "Every tracked link Curbio has in the world — QR, print, email, partner, paid — in one registry, with its performance attached.",
    status: "partial",
    needs: [
      "Click counts for the go.curbio.com redirects (today: lifetime hits from the July 28 export only)",
      "Lead-traffic join beyond the recent-leads window",
    ],
  },
  {
    slug: "contacts",
    label: "Contacts",
    purpose:
      "Every agent we know, by status — the pool cold outreach draws from and the ledger engagement graduates through.",
    status: "waiting",
    needs: [
      "Contact store (import from ActiveCampaign + Instantly lists)",
      "Status field computed by the graduation rule",
      "Instantly webhook so positive replies graduate contacts out of cold",
    ],
  },
  {
    slug: "forms",
    label: "Forms",
    purpose:
      "Where every Engaged conversion is counted — submissions by form type, and whether the promised asset was delivered.",
    status: "waiting",
    needs: [
      "/api/intake endpoint receiving form submissions",
      "Form-type registry on each embedded form",
      "Asset-delivery confirmation events (toolkit send, webinar link, coupon)",
    ],
  },
  {
    slug: "partners",
    label: "Partners",
    purpose: "The brokerage call plan — who to move next, sorted by next step date.",
    status: "partial",
    needs: [
      "Partner-page inquiry events flowing from /api/intake — agents reached and meetings are LOGGED (typed in) until then",
    ],
  },
  {
    slug: "outreach",
    label: "Outreach",
    purpose:
      "The $15-Starbucks vs. plain-email A/B and each HSM's weekly cadence. The conversion event is a meeting, not a quote.",
    target: `${OUTREACH_WEEKLY_MAILINGS_TARGET} mailings and ${OUTREACH_WEEKLY_CALLS_TARGET} calls per HSM per week`,
    status: "waiting",
    needs: [
      "Mailing log (who, which arm, when) per HSM",
      "Meeting-booked events attributable to an arm",
      "Spend entry for card cost (for cost per meeting)",
    ],
  },
  {
    slug: "events",
    label: "Events",
    purpose:
      "Event pipeline by format — invited through attended through leads, and what each attendee cost.",
    target: `$${COST_PER_ATTENDEE_TARGET_USD} per attendee`,
    status: "waiting",
    needs: [
      "Event log store (format, date, market, invited/registered/attended)",
      "event_rsvp submissions from /api/intake",
      "Call tracking numbers per event — without them, follow-up estimate requests land as direct",
      "Spend entry per event (for cost per attendee)",
    ],
  },
  {
    slug: "executive",
    label: "Executive",
    purpose:
      "The exec review — Qualified vs. the 50 target per market, with engagement as the leading indicator. Built to be read by people who have never seen the other pages.",
    target: `${QUALIFIED_TARGET_PER_MARKET_PER_MONTH} Qualified per market per month`,
    status: "partial",
    needs: [
      "Live app sync — interim: the scorecard reads the one-time snapshot (config/appLeadsSnapshot.json)",
      "Engaged sources (ActiveCampaign, Instantly, /api/intake) before the funnel's Engaged stage can show a number",
      "Event and outreach logs (for the initiative scorecards)",
    ],
  },
  {
    slug: "settings",
    label: "Settings",
    purpose: "Spend entry, the UTM builder, and sync/webhook health.",
    status: "partial",
    needs: [
      "Spend store (month × market × channel × amount)",
      "Webhook health checks for ActiveCampaign, Instantly, and /api/intake",
      "App sync heartbeat",
    ],
  },
];

export const HUB_SURFACE_BY_SLUG: Record<string, HubSurface> = Object.fromEntries(
  HUB_SURFACES.map((s) => [s.slug, s])
);

// ── Sidebar grouping ─────────────────────────────────────────────────────────
//
// The sidebar's four sections, in reading order: the screen that answers the
// question, the screens that explain it, the screens that change it, and the
// screens that present it. Every slug must exist in HUB_SURFACES — the
// exhaustiveness check below fails the build if the two lists drift.

export const HUB_NAV_GROUPS: { title: string; slugs: string[] }[] = [
  { title: "Overview", slugs: ["today"] },
  { title: "Analyze", slugs: ["report", "channels", "markets", "attribution"] },
  { title: "Operate", slugs: ["links", "contacts", "forms", "partners", "outreach", "events"] },
  { title: "Present", slugs: ["executive", "settings"] },
];

// Runtime exhaustiveness: every surface appears in exactly one group.
{
  const grouped = HUB_NAV_GROUPS.flatMap((g) => g.slugs);
  const all = HUB_SURFACES.map((s) => s.slug);
  if (grouped.length !== all.length || !all.every((s) => grouped.includes(s))) {
    throw new Error("config/marketingHub.ts: HUB_NAV_GROUPS and HUB_SURFACES disagree");
  }
}
