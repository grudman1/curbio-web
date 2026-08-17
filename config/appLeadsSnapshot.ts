// ─────────────────────────────────────────────────────────────────────────────
// APP LEADS SNAPSHOT — the Marketing Hub's interim Qualified data source.
//
// appLeadsSnapshot.json is a one-time, PII-stripped export of every estimate
// request in app.curbio.com YTD (see scripts/import-app-leads.mjs). Every
// deal in it is QUALIFIED by definition — a request for an estimate, nothing
// else. It contains no Engaged data, no spend, and no first-touch history,
// so those metrics stay em-dashes; this file never invents them.
//
// This is a SNAPSHOT, not a sync. It is accurate through `asOf` and drifts
// after. Every surface that renders from it labels it as such. When the live
// app sync lands, the JSON is deleted, not migrated — and this file's
// aggregation functions become the read layer over the sync instead.
//
// All interpretation lives HERE, reviewable and typed:
//   app market code → market slug   via MARKETS.appMarketCodes; unmapped
//                                   codes (SEA, SD) aggregate under "Other
//                                   markets" and never become market rows.
//   stage → funnel ordinal          the app's stage names, mapped onto the
//                                   Hub's six-stage funnel. Funnel counts are
//                                   CUMULATIVE (reached-at-least): a deal at
//                                   Proposal sent has passed Meeting
//                                   scheduled. Closed means status Won ONLY.
//   referral source → channel       conservative: only sources with a known,
//                                   certain meaning are mapped. Everything
//                                   ambiguous stays `direct`, per the same
//                                   boundary rule lib/channels.ts enforces.
//                                   The snapshot carries LAST-known source
//                                   only — the app's first-touch fields are
//                                   empty (verified against its attribution
//                                   report export), so first-touch views
//                                   render em-dashes, honestly.
// ─────────────────────────────────────────────────────────────────────────────

import type { Channel } from "@/lib/channels";
import { MARKETS } from "@/config/markets";
import { FUNNEL_STAGES } from "@/config/marketingHub";
import snapshot from "./appLeadsSnapshot.json";

export type SnapshotDeal = {
  marketCode: string;
  /** "2026-01-06" — created date, day-level. Not PII; identity fields are
   *  stripped at the import boundary. Days exist so weekly sparklines and
   *  pace-to-date math can be real numbers instead of em-dashes. */
  date: string;
  /** "2026-01" — derived from `date` at import. */
  month: string;
  stage: string;
  status: string;
  referralSource: string;
  dealType: string;
  value: number | null;
};

export const SNAPSHOT_AS_OF: string = snapshot.asOf;
export const SNAPSHOT_LABEL = `app snapshot · through ${snapshot.asOf}`;
export const SNAPSHOT_DEALS: SnapshotDeal[] = snapshot.deals;

/** Every month with at least one deal, ascending ("2026-01"…). The Hub's
 *  timeframe selector offers exactly these — never a month with no data. */
export const SNAPSHOT_MONTHS: string[] = [...new Set(SNAPSHOT_DEALS.map((d) => d.month))].sort();

/** The aggregate row for app markets we don't serve landing pages for. */
export const OTHER_MARKETS_KEY = "__other__";
export const OTHER_MARKETS_LABEL = "Other markets";

// ── app market code → market slug ────────────────────────────────────────────

const CODE_TO_SLUG: Record<string, string> = Object.fromEntries(
  MARKETS.flatMap((m) => m.appMarketCodes.map((code) => [code, m.slug]))
);

export function marketKeyForCode(code: string): string {
  return CODE_TO_SLUG[code] ?? OTHER_MARKETS_KEY;
}

// ── stage → funnel ordinal (0-based index into FUNNEL_STAGES) ────────────────
//
// The app's post-proposal production stages (Contract sent, Waiting on
// deposit, Design, WIP, Completed) mean the deal got at least as far as
// Proposal sent. They do NOT mean Closed — Closed is status Won, exclusively.

const STAGE_ORDINAL: Record<string, number> = {
  "Lead": 0,
  "Spoke with Agent": 1,
  "Meeting Scheduled": 2,
  "Completed Walkthrough": 3,
  "Proposal Sent": 4,
  "Contract Sent": 4,
  "Waiting on Deposit": 4,
  "Design": 4,
  "WIP": 4,
  "Completed": 4,
};

/** Highest funnel stage the deal verifiably reached (0..5). */
export function funnelOrdinal(deal: SnapshotDeal): number {
  if (deal.status === "Won") return FUNNEL_STAGES.length - 1; // Closed
  return STAGE_ORDINAL[deal.stage] ?? 0;
}

export function isClosed(deal: SnapshotDeal): boolean {
  return deal.status === "Won";
}

// ── referral source → channel (last touch; conservative) ─────────────────────
//
// Only certain meanings are mapped. `landing page` / `AtlantaLP` /
// `www.curbio.com` / `curbio.com/atlanta` tell us WHERE the form was, not
// what brought the visitor — those stay `direct`, same as the boundary rule
// in lib/channels.ts. Review this table line by line; correcting a line and
// re-rendering is the whole update procedure.

export const REFERRAL_SOURCE_CHANNEL: Record<string, Channel> = {
  // Brokerage / platform partner programs.
  "Exp": "partnership",
  "Long&FosterLift": "partnership",
  "KWOfferings": "partnership",
  "lonewolf": "partnership",
  // Email replies and campaigns.
  "Inbound Email": "email",
};

export function channelForDeal(deal: SnapshotDeal): Channel {
  return REFERRAL_SOURCE_CHANNEL[deal.referralSource] ?? "direct";
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
 *  exactly that set. No filter = the whole snapshot (YTD). */
export function aggregateSnapshot(monthFilter?: ReadonlySet<string>): SnapshotAggregates {
  const cells: Record<string, CellAggregate> = {};
  const qualifiedByMarketMonth: Record<string, number> = {};
  const closedByMarketMonth: Record<string, number> = {};
  const months = new Set<string>();
  const marketKeys = new Set<string>();

  for (const deal of SNAPSHOT_DEALS) {
    if (monthFilter && !monthFilter.has(deal.month)) continue;
    const marketKey = marketKeyForCode(deal.marketCode);
    const channel = channelForDeal(deal);
    const cellKey = `${marketKey}|${channel}`;
    const cell = (cells[cellKey] ??= emptyCell());

    cell.qualified++;
    const reached = funnelOrdinal(deal);
    for (let i = 0; i <= reached; i++) cell.funnel[i]++;
    if (isClosed(deal)) {
      cell.closed++;
      if (deal.value) cell.revenue += deal.value;
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
export function qualifiedByMonthChannel(): Record<string, Partial<Record<Channel, number>>> {
  const out: Record<string, Partial<Record<Channel, number>>> = {};
  for (const deal of SNAPSHOT_DEALS) {
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
  monthFilter?: ReadonlySet<string>
): Record<string, SourceBreakdownRow[]> {
  const map: Record<string, Record<string, SourceBreakdownRow>> = {};
  for (const deal of SNAPSHOT_DEALS) {
    if (monthFilter && !monthFilter.has(deal.month)) continue;
    const cellKey = `${marketKeyForCode(deal.marketCode)}|${channelForDeal(deal)}`;
    const source = deal.referralSource.trim() || "(blank)";
    const row = ((map[cellKey] ??= {})[source] ??= { source, qualified: 0, closed: 0, revenue: 0 });
    row.qualified++;
    if (isClosed(deal)) {
      row.closed++;
      if (deal.value) row.revenue += deal.value;
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
export function directShareByMonth(): { ym: string; direct: number; total: number }[] {
  const byMonth: Record<string, { direct: number; total: number }> = {};
  for (const deal of SNAPSHOT_DEALS) {
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
  monthFilter?: ReadonlySet<string>
): { source: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const deal of SNAPSHOT_DEALS) {
    if (monthFilter && !monthFilter.has(deal.month)) continue;
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
export function funnelCounts(monthFilter?: ReadonlySet<string>): number[] {
  const counts = FUNNEL_STAGES.map(() => 0);
  for (const deal of SNAPSHOT_DEALS) {
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
export function weeklyQualified(nWeeks = 12): WeeklyQualified {
  const asOf = utcMs(SNAPSHOT_AS_OF);
  const asOfDow = (new Date(asOf).getUTCDay() + 6) % 7; // Mon = 0
  const firstWeekStart = asOf - asOfDow * DAY_MS - (nWeeks - 1) * WEEK_MS;

  const weekStarts = Array.from({ length: nWeeks }, (_, i) =>
    new Date(firstWeekStart + i * WEEK_MS).toISOString().slice(0, 10)
  );
  const byMarket: Record<string, number[]> = {};
  const total = weekStarts.map(() => 0);

  for (const deal of SNAPSHOT_DEALS) {
    const t = utcMs(deal.date);
    if (t < firstWeekStart || t > asOf) continue;
    const idx = Math.floor((t - firstWeekStart) / WEEK_MS);
    const key = marketKeyForCode(deal.marketCode);
    (byMarket[key] ??= weekStarts.map(() => 0))[idx]++;
    total[idx]++;
  }

  return { weekStarts, byMarket, total };
}
