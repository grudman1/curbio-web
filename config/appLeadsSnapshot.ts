// ─────────────────────────────────────────────────────────────────────────────
// APP LEADS SNAPSHOT — the dashboard's Qualified data source.
//
// appLeadsSnapshot.json is a one-time, PII-stripped export of every estimate
// request in app.curbio.com YTD, joined and CHANNEL-BACKFILLED at import by
// scripts/import-app-snapshot.ts (source: "app-import", snapshot 2026-08-29).
// Every deal in it is QUALIFIED by definition — a request for an estimate,
// nothing else. It contains no Engaged data, no spend, and no first-touch
// history, so those metrics stay em-dashes; this file never invents them.
//
// This is a SNAPSHOT, not a sync. It is accurate through `asOf` and drifts
// after. Every surface that renders from it labels it as such. When the live
// API connection lands, imported records are superseded by API data keyed on
// `dealId` — and this file's aggregation functions become the read layer over
// the sync instead.
//
// Attribution provenance is carried PER DEAL, computed once at import:
//   measured           real UTM/channel signal captured at submission — the
//                      web door working. Never touched by any mapping.
//   inferred           channel backfilled from the referral source via
//                      config/referral-backfill.ts (Attribution Spec v3.2
//                      §8). The mapping file is the ONLY place inference
//                      lives — no per-lead edits, ever.
//   inferred-by-date   a backfilled email lead whose campaign was assigned
//                      by Mailchimp send-time correlation at import.
// Never present inferred as tracked: surfaces that show channel numbers on
// inferred rows mark them.
//
// Other interpretation, still here and typed:
//   app market code → market slug   via config/market-map.ts (the source of
//                                   truth for rollups): BAL/NMD/SMD → the one
//                                   Maryland market; SD is CLOSED — history
//                                   aggregates under the other/closed bucket,
//                                   shows in trends, and never counts toward
//                                   pace, targets, or active-market counts.
//   stage → funnel ordinal          the app's stage names, mapped onto the
//                                   Hub's six-stage funnel. Funnel counts are
//                                   CUMULATIVE (reached-at-least): a deal at
//                                   Proposal sent has passed Meeting
//                                   scheduled. Closed means status Won ONLY.
// The app's first-touch fields are empty (no cookies existed for these
// leads), so first-touch views render em-dashes, honestly.
// ─────────────────────────────────────────────────────────────────────────────

import type { Channel } from "@/lib/channels";
import type { AttributionQuality } from "@/config/referral-backfill";
import { reportingMarketForAppCode } from "@/config/market-map";
import { MARKETS } from "@/config/markets";
import { FUNNEL_STAGES } from "@/config/marketingHub";
import snapshot from "./appLeadsSnapshot.json";

export type SnapshotDeal = {
  /** The app's Deal ID — the key live API data supersedes this record on. */
  dealId: string;
  marketCode: string;
  /** "2026-01-06" — created date, day-level. Not PII; identity fields are
   *  stripped at the import boundary. Days exist so weekly sparklines and
   *  pace-to-date math can be real numbers instead of em-dashes. */
  date: string;
  /** "2026-01" — derived from `date` at import. */
  month: string;
  stage: string;
  status: string;
  /** Verbatim, never normalised (spec §3b). */
  referralSource: string;
  dealType: string;
  value: number | null;
  /** Won-project revenue from the sales report, where it joined. */
  revenue?: number;
  /** Backfilled or measured at import — see header. */
  channel: Channel;
  entryPoint: "web_form" | "phone" | "manual" | "inbound_email";
  attribution: AttributionQuality;
  /** Low-confidence backfill (e.g. lonewolf) — flagged for reclassification. */
  lowConfidence?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  /** Campaign correlation matched ≥2 candidates; the nearer send won. */
  campaignAmbiguous?: boolean;
};

/** The Attribution page's provenance filter. "inferred" covers both mapping-
 *  backfilled rows and date-correlated ones. */
export type AttributionFilter = "all" | "measured" | "inferred";

export function isInferred(deal: SnapshotDeal): boolean {
  return deal.attribution !== "measured";
}

function matchesAttribution(deal: SnapshotDeal, filter: AttributionFilter): boolean {
  if (filter === "all") return true;
  return filter === "measured" ? !isInferred(deal) : isInferred(deal);
}

export const SNAPSHOT_AS_OF: string = snapshot.asOf;
export const SNAPSHOT_LABEL = `app snapshot · through ${snapshot.asOf}`;
// The JSON is written typed by scripts/import-app-snapshot.ts (which imports
// the same Channel/AttributionQuality unions); the cast re-narrows what JSON
// import widening loses.
export const SNAPSHOT_DEALS: SnapshotDeal[] = snapshot.deals as SnapshotDeal[];

/** Every month with at least one deal, ascending ("2026-01"…). The Hub's
 *  timeframe selector offers exactly these — never a month with no data. */
export const SNAPSHOT_MONTHS: string[] = [...new Set(SNAPSHOT_DEALS.map((d) => d.month))].sort();

/** The aggregate row for closed markets (SD) and any app code we don't serve
 *  landing pages for. History shows in trends; the bucket never counts toward
 *  pace, targets, or active-market denominators. */
export const OTHER_MARKETS_KEY = "__other__";
export const OTHER_MARKETS_LABEL = "Other / closed markets";

// ── app market code → market slug ────────────────────────────────────────────
// config/market-map.ts is the source of truth for the rollup (BAL/NMD/SMD →
// Maryland; SD closed). A code only lands on a market ROW when the rollup
// says it's active AND a MARKETS row exists for it — closed markets keep
// their history in the other/closed bucket rather than vanishing.

const CODE_TO_SLUG: Record<string, string> = Object.fromEntries(
  MARKETS.flatMap((m) => m.appMarketCodes.map((code) => [code, m.slug]))
);

export function marketKeyForCode(code: string): string {
  const reporting = reportingMarketForAppCode(code);
  if (!reporting || !reporting.active) return OTHER_MARKETS_KEY;
  return CODE_TO_SLUG[code] ?? OTHER_MARKETS_KEY;
}

// ── stage → funnel ordinal (0-based index into FUNNEL_STAGES) ────────────────
//
// The app's post-proposal production stages (Contract sent, Waiting on
// deposit, Design, WIP, Completed) mean the deal got at least as far as
// Proposal sent. They do NOT mean Closed — Closed is status Won, exclusively.

// Keyed LOWERCASE: the app's exports have not been consistent about stage
// casing ("Spoke with Agent" vs "Spoke with agent" across report types), and
// a casing drift must never silently demote deals to ordinal 0.
const STAGE_ORDINAL: Record<string, number> = {
  "lead": 0,
  "spoke with agent": 1,
  "meeting scheduled": 2,
  "completed walkthrough": 3,
  "proposal sent": 4,
  "contract sent": 4,
  "waiting on deposit": 4,
  "design": 4,
  "wip": 4,
  "completed": 4,
};

/** Highest funnel stage the deal verifiably reached (0..5). */
export function funnelOrdinal(deal: SnapshotDeal): number {
  if (deal.status === "Won") return FUNNEL_STAGES.length - 1; // Closed
  return STAGE_ORDINAL[deal.stage.toLowerCase()] ?? 0;
}

export function isClosed(deal: SnapshotDeal): boolean {
  return deal.status === "Won";
}

// ── channel ──────────────────────────────────────────────────────────────────
//
// The channel is computed ONCE, at import, by scripts/import-app-snapshot.ts:
// real UTM signals verbatim (measured), everything else through the versioned
// backfill mapping in config/referral-backfill.ts (inferred — spec §8). This
// file no longer keeps its own referral-source table; correcting a mapping
// line and re-running the import is the whole update procedure.

export function channelForDeal(deal: SnapshotDeal): Channel {
  return deal.channel;
}

// ── aggregation ──────────────────────────────────────────────────────────────

export type CellAggregate = {
  qualified: number;
  closed: number;
  /** Sum of deal value across WON deals only. */
  revenue: number;
  /** Cumulative reached-at-least counts, one per FUNNEL_STAGES entry. */
  funnel: number[];
};

function emptyCell(): CellAggregate {
  return { qualified: 0, closed: 0, revenue: 0, funnel: FUNNEL_STAGES.map(() => 0) };
}

export type SnapshotAggregates = {
  /** `${marketKey}|${channel}` → totals across the whole snapshot (YTD). */
  cells: Record<string, CellAggregate>;
  /** `${marketKey}|${month}` → Qualified count (for targets & Monthly). */
  qualifiedByMarketMonth: Record<string, number>;
  /** `${marketKey}|${month}` → closed / revenue (for Monthly). */
  closedByMarketMonth: Record<string, number>;
  /** Months present, ascending ("2026-01"…). */
  months: string[];
  /** True when the market key has any snapshot data at all. */
  marketKeys: string[];
};

/** Aggregate the snapshot, optionally over a subset of months — the Hub's
 *  timeframe selector resolves to a month set and every page aggregates over
 *  exactly that set. No filter = the whole snapshot (YTD). The attribution
 *  filter (Attribution page) narrows to measured or inferred provenance. */
export function aggregateSnapshot(
  monthFilter?: ReadonlySet<string>,
  attribution: AttributionFilter = "all",
  deals: SnapshotDeal[] = SNAPSHOT_DEALS
): SnapshotAggregates {
  const cells: Record<string, CellAggregate> = {};
  const qualifiedByMarketMonth: Record<string, number> = {};
  const closedByMarketMonth: Record<string, number> = {};
  const months = new Set<string>();
  const marketKeys = new Set<string>();

  for (const deal of deals) {
    if (monthFilter && !monthFilter.has(deal.month)) continue;
    if (!matchesAttribution(deal, attribution)) continue;
    const marketKey = marketKeyForCode(deal.marketCode);
    const channel = channelForDeal(deal);
    const cellKey = `${marketKey}|${channel}`;
    const cell = (cells[cellKey] ??= emptyCell());

    cell.qualified++;
    const reached = funnelOrdinal(deal);
    for (let i = 0; i <= reached; i++) cell.funnel[i]++;
    if (isClosed(deal)) {
      cell.closed++;
      // Won-project revenue from the sales report where it joined; the deal
      // value otherwise. Never both.
      const rev = deal.revenue ?? deal.value;
      if (rev) cell.revenue += rev;
    }

    const mm = `${marketKey}|${deal.month}`;
    qualifiedByMarketMonth[mm] = (qualifiedByMarketMonth[mm] ?? 0) + 1;
    if (isClosed(deal)) closedByMarketMonth[mm] = (closedByMarketMonth[mm] ?? 0) + 1;
    months.add(deal.month);
    marketKeys.add(marketKey);
  }

  return {
    cells,
    qualifiedByMarketMonth,
    closedByMarketMonth,
    months: [...months].sort(),
    marketKeys: [...marketKeys],
  };
}

// ── month × channel counts (trend chart / channel pages) ─────────────────────

/** Qualified per month per channel, across ALL markets, whole snapshot.
 *  month → channel → count. Only months and channels with deals appear. */
export function qualifiedByMonthChannel(
  deals: SnapshotDeal[] = SNAPSHOT_DEALS
): Record<string, Partial<Record<Channel, number>>> {
  const out: Record<string, Partial<Record<Channel, number>>> = {};
  for (const deal of deals) {
    const ch = channelForDeal(deal);
    const m = (out[deal.month] ??= {});
    m[ch] = (m[ch] ?? 0) + 1;
  }
  return out;
}

// ── per-cell source breakdown (Report drill-down) ────────────────────────────

export type SourceBreakdownRow = {
  /** The app's raw referral source — the nearest thing the snapshot has to a
   *  campaign dimension. "(blank)" when the app recorded nothing. */
  source: string;
  qualified: number;
  closed: number;
  revenue: number;
};

/** `${marketKey}|${channel}` → rows by raw referral source, most Qualified
 *  first. What the drill-down drawer shows. The snapshot is PII-stripped and
 *  carries no lead ids, so a per-lead list (names, dates, app links) is
 *  honestly impossible until the live sync exists. */
export function cellSourceBreakdowns(
  monthFilter?: ReadonlySet<string>,
  deals: SnapshotDeal[] = SNAPSHOT_DEALS
): Record<string, SourceBreakdownRow[]> {
  const map: Record<string, Record<string, SourceBreakdownRow>> = {};
  for (const deal of deals) {
    if (monthFilter && !monthFilter.has(deal.month)) continue;
    const cellKey = `${marketKeyForCode(deal.marketCode)}|${channelForDeal(deal)}`;
    const source = deal.referralSource.trim() || "(blank)";
    const row = ((map[cellKey] ??= {})[source] ??= { source, qualified: 0, closed: 0, revenue: 0 });
    row.qualified++;
    if (isClosed(deal)) {
      row.closed++;
      const rev = deal.revenue ?? deal.value;
      if (rev) row.revenue += rev;
    }
  }
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [
      k,
      Object.values(v).sort((a, b) => b.qualified - a.qualified),
    ])
  );
}

// ── attribution health ───────────────────────────────────────────────────────

/** Per month: how many Qualified arrived with no known channel (direct), and
 *  the month's total. The share of direct IS the attribution-health number. */
export function directShareByMonth(
  attribution: AttributionFilter = "all",
  deals: SnapshotDeal[] = SNAPSHOT_DEALS
): { ym: string; direct: number; total: number }[] {
  const byMonth: Record<string, { direct: number; total: number }> = {};
  for (const deal of deals) {
    if (!matchesAttribution(deal, attribution)) continue;
    const m = (byMonth[deal.month] ??= { direct: 0, total: 0 });
    m.total++;
    if (channelForDeal(deal) === "direct") m.direct++;
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([ym, v]) => ({ ym, ...v }));
}

/** What the app recorded for the deals we count as direct — the raw referral
 *  sources that carry no usable channel meaning. This list is the to-do list
 *  for shrinking the unattributed number: phone sources need call tracking,
 *  site sources need UTM discipline, blanks need a form that captures. */
export function directSourceBreakdown(
  monthFilter?: ReadonlySet<string>,
  attribution: AttributionFilter = "all",
  deals: SnapshotDeal[] = SNAPSHOT_DEALS
): { source: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const deal of deals) {
    if (monthFilter && !monthFilter.has(deal.month)) continue;
    if (!matchesAttribution(deal, attribution)) continue;
    if (channelForDeal(deal) !== "direct") continue;
    const source = deal.referralSource.trim() || "(blank)";
    counts[source] = (counts[source] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

// ── funnel counts (Today / Executive) ────────────────────────────────────────

/** Cumulative reached-at-least counts per FUNNEL_STAGES entry, over the given
 *  months (all months when omitted). Closed = status Won only. */
export function funnelCounts(
  monthFilter?: ReadonlySet<string>,
  deals: SnapshotDeal[] = SNAPSHOT_DEALS
): number[] {
  const counts = FUNNEL_STAGES.map(() => 0);
  for (const deal of deals) {
    if (monthFilter && !monthFilter.has(deal.month)) continue;
    const reached = funnelOrdinal(deal);
    for (let i = 0; i <= reached; i++) counts[i]++;
  }
  return counts;
}

// ── weekly Qualified (sparkline source) ──────────────────────────────────────

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

function utcMs(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export type WeeklyQualified = {
  /** Monday of each week, ascending, ISO dates. The LAST week is partial —
   *  it runs only through the snapshot's as-of date. */
  weekStarts: string[];
  /** marketKey → one count per week. Only markets with any deal appear. */
  byMarket: Record<string, number[]>;
  /** All markets combined (including "other"). */
  total: number[];
};

/** Qualified per week for the trailing `nWeeks` calendar weeks (Mon-based)
 *  ending at the snapshot's as-of date. Counts deals, invents nothing —
 *  the final bucket is partial exactly as far as the snapshot reaches. */
export function weeklyQualified(nWeeks = 12, deals: SnapshotDeal[] = SNAPSHOT_DEALS): WeeklyQualified {
  const asOf = utcMs(SNAPSHOT_AS_OF);
  const asOfDow = (new Date(asOf).getUTCDay() + 6) % 7; // Mon = 0
  const firstWeekStart = asOf - asOfDow * DAY_MS - (nWeeks - 1) * WEEK_MS;

  const weekStarts = Array.from({ length: nWeeks }, (_, i) =>
    new Date(firstWeekStart + i * WEEK_MS).toISOString().slice(0, 10)
  );
  const byMarket: Record<string, number[]> = {};
  const total = weekStarts.map(() => 0);

  for (const deal of deals) {
    const t = utcMs(deal.date);
    if (t < firstWeekStart || t > asOf) continue;
    const idx = Math.floor((t - firstWeekStart) / WEEK_MS);
    const key = marketKeyForCode(deal.marketCode);
    (byMarket[key] ??= weekStarts.map(() => 0))[idx]++;
    total[idx]++;
  }

  return { weekStarts, byMarket, total };
}
