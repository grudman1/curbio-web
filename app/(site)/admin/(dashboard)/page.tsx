import type { Metadata } from "next";
import Link from "next/link";
import { MARKETS } from "@/config/markets";
import {
  REVENUE_BY_WON_MONTH,
  SNAPSHOT_AS_OF,
  SNAPSHOT_MONTHS,
  aggregateSnapshot,
  channelForDeal,
  funnelOrdinal,
  isClosed,
  marketKeyForCode,
  revenueForMonths,
  wonProjectsForMonths,
  type SnapshotDeal,
} from "@/config/appLeadsSnapshot";
import {
  CHANNEL_FUNNEL_ORDER,
  CHANNEL_LABELS,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
} from "@/config/marketingHub";
import { CHANNEL_PLAN } from "@/config/channelPlan";
import { readRecentLeads, recentCrmFailures } from "@/lib/adminLeads";
import { mergedSnapshotDeals } from "@/lib/leadStore";
import { computeUndocumentedCampaigns } from "@/lib/campaignOrphans";
import type { Channel } from "@/lib/channels";
import { paceRead } from "@/app/(site)/marketing/(hub)/pacing";
import {
  monthLabelFull,
  monthShort,
  monthsFor,
  parseTimeframe,
  timeframeLabel,
} from "../_ui/timeframe";
import { currentAdminUser } from "../_ui/session";
import { firstNameFrom } from "../_ui/userDisplay";
import { AskHero } from "./AskHero";
import {
  ChannelsTable,
  OpsCard,
  OpsDelta,
  OpsMetric,
  PaceGauge,
  ProgressRows,
  Callouts,
  QualifiedByMonth,
  Sparkline,
  channelLabel,
  formatFreshness,
  type Callout,
  type ChannelLegend,
  type ChannelRow,
  type ProgressRow,
  type SparkPoint,
  type TrendMonth,
} from "../_ui/v2";

// ─────────────────────────────────────────────────────────────────────────────
// HOME — on the ops design system (_ui/v2/tokens.css).
//
// A dashboard grid rather than a stack of full-width bands: ask hero, then a
// KPI row, then a 12-column body that pairs the pace gauge with the market
// breakdown and the chart with its channel table. Analytics answers "why";
// Home answers "where are we, and what is costing us the most".
//
// ── What replaced what ─────────────────────────────────────────────────────
// The flat pacing bar became a PaceGauge — same three measured numbers
// (actual, expected-by-now, target), read as an arc against a threshold.
// "What's in the way" became ProgressRows over every market: a ranked list of
// three blockers was three sentences where eight bars are the whole picture,
// and the bars need no titles to write.
//
// ── The prose rule ─────────────────────────────────────────────────────────
// NO EXPLANATORY COPY ANYWHERE ON THIS SCREEN. No caption telling the reader
// what a chart means, no sentence naming which band is unattributed, no
// "hover a bar", no coaching. Legends, axis labels and column headers carry
// that weight; anything that genuinely needs explaining is a tooltip or it is
// cut. Every string below is either a label, a measured number, or a title
// that stands on its own.
//
// ── Everything here is real data, none of it invented ──────────────────────
// Every figure comes from the merged lead store (the channel-backfilled app
// import plus post-snapshot live leads) through the same aggregation the
// Markets, Channels and Report screens use. Historical channels before
// 2026-08-29 are partly INFERRED via the spec-§8 referral-source mapping —
// the Attribution page carries the measured/inferred split. Where a metric
// has no source — Blended CAC needs the spend store, which does not exist
// yet — the card shows a hollow status dot and an em-dash, never an invented
// number and never a caption about it.
//
// ── Two comparisons, and why they are different ────────────────────────────
// PACE compares against the target, prorated to the snapshot's as-of day
// (paceRead). DELTAS compare against the prior month cut at the SAME
// day-of-month — comparing 14 days of August against 31 days of July would
// manufacture a collapse. Both are stated in the labels the reader sees.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Home · Ops — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** How many recent leads to scan for delivery outcomes and campaign tags. */
const SCAN = 200;

/** A snapshot older than this stops being "current" and says so. */
const STALE_AFTER_DAYS = 10;

type MonthCut = {
  total: number;
  byChannel: Partial<Record<Channel, number>>;
  byMarket: Record<string, number>;
  meetings: Partial<Record<Channel, number>>;
  proposals: Partial<Record<Channel, number>>;
};

/** Deals across `monthSet`, with the LAST month truncated at `throughDay`.
 *
 *  Windows are cut this way — not just the latest month — because every panel
 *  on this screen states the selected window in its title, and computing any
 *  of them from the newest month alone made the title a lie: "Channels, Last 3
 *  months" over August's 56 leads, and "23 expected each" against a
 *  three-month target. The truncation applies to whichever month is last so a
 *  window ending in the partial as-of month compares like-for-like against a
 *  prior window cut to the same shape.
 *
 *  Every row in the snapshot is Qualified by definition, so a count IS the
 *  Qualified figure. */
function cutWindow(
  monthSet: readonly string[],
  throughDay: number,
  deals: SnapshotDeal[]
): MonthCut {
  const out: MonthCut = { total: 0, byChannel: {}, byMarket: {}, meetings: {}, proposals: {} };
  const last = monthSet[monthSet.length - 1];
  const inWindow = new Set(monthSet);
  for (const deal of deals) {
    if (!inWindow.has(deal.month)) continue;
    if (deal.month === last && Number(deal.date.slice(8, 10)) > throughDay) continue;
    const ch = channelForDeal(deal);
    const mk = marketKeyForCode(deal.marketCode);
    out.total++;
    out.byChannel[ch] = (out.byChannel[ch] ?? 0) + 1;
    out.byMarket[mk] = (out.byMarket[mk] ?? 0) + 1;
    // Cumulative reached-at-least, the same rule aggregateSnapshot applies:
    // a deal at Proposal sent has passed Meeting scheduled.
    const reached = funnelOrdinal(deal);
    if (reached >= 2) out.meetings[ch] = (out.meetings[ch] ?? 0) + 1;
    if (reached >= 4) out.proposals[ch] = (out.proposals[ch] ?? 0) + 1;
  }
  return out;
}

/** The N months immediately before `monthSet`, for a like-for-like comparison
 *  window. Shorter than N near the start of the snapshot; empty at the start. */
function priorWindow(monthSet: readonly string[]): string[] {
  const firstIdx = SNAPSHOT_MONTHS.indexOf(monthSet[0]);
  if (firstIdx <= 0) return [];
  return SNAPSHOT_MONTHS.slice(Math.max(0, firstIdx - monthSet.length), firstIdx);
}

/** Qualified per month across the whole snapshot, for KPI sparklines. */
function monthlySeries(
  pick: (deals: SnapshotDeal[]) => number,
  deals: SnapshotDeal[]
): SparkPoint[] {
  const byMonth = new Map<string, SnapshotDeal[]>();
  for (const d of deals) {
    const list = byMonth.get(d.month) ?? [];
    list.push(d);
    byMonth.set(d.month, list);
  }
  return SNAPSHOT_MONTHS.map((ym) => ({ t: ym, v: pick(byMonth.get(ym) ?? []) }));
}

const DASH = "—";

/** Money at whatever magnitude it actually is. A fixed /1e6 printed the
 *  single won deal in a half-month window as "$0.01M", which is a formatting
 *  bug wearing a number's clothes. */
function usdCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Measured channel → the Magnificent Seven screen that owns it. */
const CHANNEL_HREF: Partial<Record<Channel, string>> = Object.fromEntries(
  CHANNEL_PLAN.flatMap((plan) => plan.channels.map((c) => [c, `/admin/channels/${plan.slug}`]))
);

const MARKET_NAME = new Map(MARKETS.map((m) => [m.slug, m.displayName]));



export default async function HomeScreen({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS, "month");
  const months = monthsFor(tf, SNAPSHOT_MONTHS);

  // cache()d in session.ts — the layout reads this in the same request, so
  // this is a shared Redis hit rather than a second one.
  const me = await currentAdminUser();
  const firstName = firstNameFrom(me?.email ?? "");

  // The merged store: channel-backfilled import + post-snapshot live leads —
  // the same read Attribution, the Email page and Performance make.
  const deals = await mergedSnapshotDeals();
  const agg = aggregateSnapshot(new Set(months), "all", deals);
  const asOfDay = Number(SNAPSHOT_AS_OF.slice(8, 10));

  // ── company pace over the selected window ────────────────────────────────
  const qualified = MARKETS.reduce(
    (sum, m) =>
      sum + months.reduce((s, ym) => s + (agg.qualifiedByMarketMonth[`${m.slug}|${ym}`] ?? 0), 0),
    0
  );
  const companyTargetPerMonth = QUALIFIED_TARGET_PER_MARKET_PER_MONTH * MARKETS.length;
  const target = companyTargetPerMonth * (months.length || 1);

  // ── ONE expectation, and the parts add up to the whole ────────────────────
  // The market rows and this card are both paceRead(), but each rounded its
  // own result: 400 × 29/31 → 374 for the company, 50 × 29/31 → 47 per market,
  // and 8 × 47 = 376. Two roundings, so the rows visibly failed to sum to the
  // total. Since the company target IS the per-market target × the market
  // count, the company EXPECTATION is defined the same way: round once, per
  // market, then multiply. Nothing else may compute an expectation.
  const expectedPerMarket =
    paceRead(0, months, SNAPSHOT_AS_OF, QUALIFIED_TARGET_PER_MARKET_PER_MONTH)?.expected ?? 0;
  const companyExpected = expectedPerMarket * MARKETS.length;
  const paceBase = paceRead(qualified, months, SNAPSHOT_AS_OF, companyTargetPerMonth);
  // state and coverage come from paceRead unchanged — only the expectation is
  // re-derived, so the thresholds stay defined in exactly one place.
  const pace = paceBase && {
    ...paceBase,
    expected: companyExpected,
    delta: qualified - companyExpected,
  };

  // ── the selected window, and the equivalent window before it ────────────
  // EVERY panel below reads these. Nothing computes from "the newest month"
  // any more: each card states the window in its own title, so each card has
  // to be measured over that window or the title is wrong.
  const latestMonth = months[months.length - 1] ?? null;
  // The as-of day truncates only the as-of month; earlier months are complete.
  const isPartial = latestMonth === SNAPSHOT_AS_OF.slice(0, 7);
  const cutDay = isPartial ? asOfDay : 31;
  const priorMonths = priorWindow(months);
  const latest = months.length ? cutWindow(months, cutDay, deals) : null;
  const prior = priorMonths.length ? cutWindow(priorMonths, cutDay, deals) : null;
  const priorLabel = priorMonths.length
    ? priorMonths.length === 1
      ? monthShort(priorMonths[0])
      : `${monthShort(priorMonths[0])}–${monthShort(priorMonths[priorMonths.length - 1])}`
    : null;

  // ── KPI row ──────────────────────────────────────────────────────────────
  const closed = Object.values(agg.cells).reduce((s, c) => s + c.closed, 0);
  // Booked revenue reads the authoritative won-date series, NOT the sum of the
  // market × channel cells. The cells hold only revenue that joined to a lead;
  // the series counts every sales row, including credits and the ones with no
  // agent email to join on. Summing cells here under-reported the month.
  const revenue = revenueForMonths(new Set(months));
  const wonProjects = wonProjectsForMonths(new Set(months));
  const closeRate = qualified > 0 ? closed / qualified : null;

  const qualifiedSpark = monthlySeries((d) => d.length, deals);
  const closeRateSpark = monthlySeries(
    (d) => (d.length ? d.filter(isClosed).length / d.length : 0),
    deals
  );
  // Won-date series, straight through — a month's bar is the money booked in
  // that month, not the value of the leads created in it.
  const revenueSpark: SparkPoint[] = SNAPSHOT_MONTHS.map((ym) => ({
    t: ym,
    v: REVENUE_BY_WON_MONTH[ym] ?? 0,
  }));

  // Prior-window comparisons for the KPI deltas, cut identically.
  const priorSet = new Set(priorMonths);
  const priorLast = priorMonths[priorMonths.length - 1];
  const priorClosed = priorMonths.length
    ? deals.filter(
        (d) =>
          priorSet.has(d.month) &&
          !(d.month === priorLast && Number(d.date.slice(8, 10)) > cutDay) &&
          isClosed(d)
      ).length
    : null;
  const priorQualified = prior?.total ?? null;
  const monthSet = new Set(months);
  const latestClosed = deals.filter(
    (d) =>
      monthSet.has(d.month) &&
      !(d.month === latestMonth && Number(d.date.slice(8, 10)) > cutDay) &&
      isClosed(d)
  ).length;
  const qualifiedDelta =
    priorQualified && latest ? (latest.total - priorQualified) / priorQualified : null;
  const closeRateDelta =
    priorQualified && priorClosed !== null && priorQualified > 0 && latest && latest.total > 0
      ? latestClosed / latest.total - priorClosed / priorQualified
      : null;

  // ── the stacked chart: every snapshot month, by channel ──────────────────
  // It always shows the FULL history and marks which months the rest of the
  // page is reading. A card-level range switcher used to live here; it wrote
  // the same ?t= the header owns, so using it silently re-scoped the whole
  // screen. One control, in the header — and the chart shows where that
  // selection sits in the trend rather than hiding the rest of it.
  const inWindow = new Set(months);
  const trendMonths: TrendMonth[] = SNAPSHOT_MONTHS.slice(-12).map((ym) => {
    const cut = cutWindow([ym], 31, deals);
    return {
      ym,
      label: monthShort(ym),
      breakdownTitle: monthLabelFull(ym),
      byChannel: cut.byChannel,
      total: cut.total,
      selected: inWindow.has(ym),
    };
  });
  const presentChannels = CHANNEL_FUNNEL_ORDER.filter((c) =>
    trendMonths.some((m) => (m.byChannel[c] ?? 0) > 0)
  ) as Channel[];
  // Labels resolved HERE, not in the chart: QualifiedByMonth is a Client
  // Component and a formatter function cannot cross that boundary.
  const chartLegend: ChannelLegend[] = presentChannels.map((c) => ({
    channel: c,
    label: channelLabel(c, CHANNEL_LABELS),
  }));

  // ── channel table: attributed channels only, in the latest cut ───────────
  const attributedChannels = presentChannels.filter((c) => c !== "direct");
  const channelRows: ChannelRow[] = attributedChannels
    .map((c) => ({
      channel: c,
      label: CHANNEL_LABELS[c],
      href: CHANNEL_HREF[c] ?? "/admin/attribution",
      qualified: latest?.byChannel[c] ?? 0,
      delta: prior ? (latest?.byChannel[c] ?? 0) - (prior.byChannel[c] ?? 0) : null,
      meetings: latest?.meetings[c] ?? 0,
      proposals: latest?.proposals[c] ?? 0,
    }))
    .filter((r) => r.qualified > 0);

  const attributedTotal = channelRows.reduce((s, r) => s + r.qualified, 0);

  // ── What's in the way: every source the app has, ranked together ────────
  // Snapshot findings, the Redis lead store's delivery outcomes and the
  // campaign registry all land in one ranked list. They are the same KIND of
  // fact to whoever opens this screen — something is wrong and it is costing
  // leads — so ranking them against each other is the point, even though each
  // comes from a different system.
  const [leads, { orphans }] = await Promise.all([
    readRecentLeads(SCAN),
    computeUndocumentedCampaigns(SCAN),
  ]);
  const leadRows = leads.configured && !leads.error ? leads.rows : [];
  const crmFailures = recentCrmFailures(leadRows);
  const storeError = leads.configured && leads.error ? leads.error : null;

  const callouts: Callout[] = [];

  if (storeError) {
    callouts.push({
      key: "lead-store",
      severity: "error",
      title: "Lead store is unreadable",
      delta: null,
      goodDirection: "down",
      href: "/admin/leads",
      linkLabel: "Leads",
      // Unknowable rather than zero — an unreadable store could be hiding any
      // number of failures, so it sorts to the top of its severity band.
      atStake: Number.MAX_SAFE_INTEGER,
    });
  }

  if (crmFailures.length > 0) {
    callouts.push({
      key: "crm-failures",
      severity: "error",
      title: `${crmFailures.length} lead${crmFailures.length === 1 ? "" : "s"} failed CRM delivery in the last 24 hours`,
      delta: -crmFailures.length,
      goodDirection: "up",
      href: "/admin/leads",
      linkLabel: "Leads",
      atStake: crmFailures.length,
    });
  }

  if (latest && latest.total > 0) {
    const unattributed = latest.byChannel.direct ?? 0;
    if (unattributed > 0) {
      const share = unattributed / latest.total;
      const priorShare =
        prior && prior.total > 0 ? (prior.byChannel.direct ?? 0) / prior.total : null;
      callouts.push({
        key: "unattributed",
        severity: share >= 0.5 ? "error" : "warning",
        title: `${unattributed} of ${latest.total} qualified leads have no known channel`,
        delta: priorShare === null ? null : Math.round((share - priorShare) * 100),
        deltaUnit: "pts",
        goodDirection: "down",
        href: "/admin/attribution",
        linkLabel: "Attribution",
        atStake: unattributed,
      });
    }
  }

  if (orphans.length > 0) {
    const leadsAtStake = orphans.reduce((n, o) => n + o.count, 0);
    callouts.push({
      key: "orphan-campaigns",
      severity: "warning",
      title: `${orphans.length} campaign tag${orphans.length === 1 ? "" : "s"} producing leads but undocumented`,
      delta: -leadsAtStake,
      goodDirection: "up",
      href: "/admin/site/links",
      linkLabel: "Links",
      atStake: leadsAtStake,
    });
  }

  // Auto-documented tags deliberately do NOT appear here. This panel is
  // "what's in the way" — blockers — and a queue of guesses awaiting
  // confirmation is not blocking anything. It lives on Links, where the
  // reviewing actually happens.

  const snapshotAge = Math.round(
    (Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(SNAPSHOT_AS_OF)) / 86_400_000
  );
  if (Number.isFinite(snapshotAge) && snapshotAge > STALE_AFTER_DAYS) {
    callouts.push({
      key: "snapshot-age",
      severity: "warning",
      title: `App snapshot is ${snapshotAge} days old`,
      delta: null,
      goodDirection: "down",
      href: "/admin/settings",
      linkLabel: "Settings",
      atStake: 0,
    });
  }

  // ── markets against pace ────────────────────────────────────────────────
  // Every market, not a top-three: the shape of the set is the finding, and
  // eight bars carry it without a sentence. Measured against the same
  // prorated expectation the company total uses, so the parts and the whole
  // are computed identically.
  // Prorated across EVERY month in the window — a three-month window expects
  // roughly three months of leads per market, not one. This read "23 expected
  // each" under a "Last 3 months" title, which was the same window bug as the
  // channel table's. `expectedPerMarket` is computed once, up with the company
  // pace, so these rows and that card cannot disagree.
  const marketRows: ProgressRow[] = MARKETS.map((m) => {
    const got = latest?.byMarket[m.slug] ?? 0;
    return {
      key: m.slug,
      name: MARKET_NAME.get(m.slug) ?? m.slug,
      // "4 of 47" read as though 47 were the target; the target is 50. A bare
      // fraction states the ratio without naming either quantity, and the
      // panel's own header carries what the denominator is.
      sub: `${got} / ${expectedPerMarket}`,
      ratio: expectedPerMarket > 0 ? got / expectedPerMarket : 0,
      figure: expectedPerMarket > 0 ? `${Math.round((got / expectedPerMarket) * 100)}%` : "—",
      href: "/admin/markets",
      tone: "accent" as const,
    };
  }).sort((a, b) => b.ratio - a.ratio);

  // The panel shows the WORST first — the eight rows worth acting on — while
  // `marketRows` stays best-first for the callouts and the hero chip below.
  // Two orderings of one array, never two sources of truth.
  // The visible cap (8 rows) is enforced in CSS by `.ops-scroll-8`, derived
  // from --ops-prow-h, so it cannot drift from the real row height.
  const marketRowsWorstFirst = [...marketRows].reverse();

  const worst = marketRows[marketRows.length - 1];
  if (worst && expectedPerMarket > 0) {
    const short = Math.round(expectedPerMarket - expectedPerMarket * worst.ratio);
    if (short > 0) {
      // The chip must measure the quantity the title names — the PACE GAP.
      // It used to carry the change in that market's qualified count, so a row
      // reading "43 behind pace" wore a green +3: two different quantities,
      // and the colour was answering the wrong one. The gap's growth is what
      // matters here, and a growing gap is bad, so goodDirection is "down".
      const priorExpectedPerMarket = priorMonths.length
        ? (paceRead(0, priorMonths, SNAPSHOT_AS_OF, QUALIFIED_TARGET_PER_MARKET_PER_MONTH)
            ?.expected ?? 0)
        : 0;
      const priorShort =
        prior && priorExpectedPerMarket > 0
          ? Math.max(0, Math.round(priorExpectedPerMarket - (prior.byMarket[worst.key] ?? 0)))
          : null;
      callouts.push({
        key: `market-${worst.key}`,
        severity: worst.ratio < 0.5 ? "error" : "warning",
        title: `${worst.name} is ${short} behind pace, the widest market gap`,
        delta: priorShort === null ? null : short - priorShort,
        goodDirection: "down",
        href: "/admin/markets",
        linkLabel: "Markets",
        atStake: short,
      });
    }
  }

  if (latest && prior) {
    const drops = attributedChannels
      .map((c) => ({ c, drop: (prior.byChannel[c] ?? 0) - (latest.byChannel[c] ?? 0) }))
      .filter((r) => r.drop > 0)
      .sort((a, b) => b.drop - a.drop);
    const worstDrop = drops[0];
    if (worstDrop) {
      callouts.push({
        key: `channel-${worstDrop.c}`,
        severity: "warning",
        title: `${CHANNEL_LABELS[worstDrop.c]} is down ${worstDrop.drop} qualified, the largest attributed drop`,
        delta: -worstDrop.drop,
        goodDirection: "up",
        href: CHANNEL_HREF[worstDrop.c] ?? "/admin/attribution",
        linkLabel: CHANNEL_LABELS[worstDrop.c],
        atStake: worstDrop.drop,
      });
    }
  }

  // Errors above warnings, then by leads at stake. Five rows is the cap: this
  // is a list of what to do next, and a list of everything is a list of
  // nothing.
  const rankedCallouts = callouts
    .sort((a, b) =>
      a.severity === b.severity
        ? b.atStake - a.atStake
        : a.severity === "error"
          ? -1
          : 1
    )
    .slice(0, 5);

  // ── hero context ─────────────────────────────────────────────────────────
  const windowLabel = timeframeLabel(tf, SNAPSHOT_MONTHS);

  // One chip per capability the assistant actually has: diagnosis, copy
  // generation, data Q&A, site/tech. They are the page's statement of what it
  // can answer, so they cover the four surfaces rather than four flavours of
  // the same pacing question.
  // The SHORT market name here ("Maryland"), not the display name
  // ("Maryland, MD") — this is a sentence, and the state code reads as a typo
  // inside one. Both strings are live text; config/markets.ts keeps them apart
  // on purpose.
  const bestMarket = marketRows[0]
    ? (MARKETS.find((m) => m.slug === marketRows[0].key)?.name ?? marketRows[0].name)
    : null;
  const suggestions = [
    { label: "What's broken right now?", ink: "var(--ops-error-500)" },
    { label: "Draft an email campaign for Atlanta agents", ink: "var(--ops-accent)" },
    {
      label: bestMarket ? `Why is ${bestMarket} ahead?` : "Which market is furthest ahead?",
      ink: "var(--ops-brand)",
    },
    { label: "What's our tech stack?", ink: "var(--ops-ch-direct)" },
  ];


  return (
    <>
      <AskHero
        configured={Boolean(process.env.ANTHROPIC_API_KEY)}
        firstName={firstName}
        suggestions={suggestions}
      />

      {/* KPI row FIRST. The four headline numbers are what the screen is for;
          "what's in the way" is the follow-up question, and it was reading as
          the headline purely by sitting above them. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <OpsMetric
          label="Qualified leads"
          value={qualified.toLocaleString("en-US")}
          // No "/ 400" here. The Pace card owns the target and shows it against
          // expected-to-date, which is the reading that means something; a bare
          // "122 / 400" invited comparison against the full-year target on a
          // partial month and duplicated the gauge.
          sparkline={<Sparkline points={qualifiedSpark} tone="var(--ops-accent)" />}
          badge={
            priorLabel ? (
              <OpsDelta
                value={qualifiedDelta === null ? null : Math.round(qualifiedDelta * 100)}
                suffix="%"
                label={`vs ${priorLabel}`}
              />
            ) : undefined
          }
        />
        <OpsMetric
          label="Close rate"
          value={closeRate === null ? DASH : `${(closeRate * 100).toFixed(1)}%`}
          sparkline={<Sparkline points={closeRateSpark} tone="var(--ops-brand)" />}
          badge={
            priorLabel ? (
              <OpsDelta
                value={closeRateDelta === null ? null : Math.round(closeRateDelta * 1000) / 10}
                suffix=" pts"
                label={`vs ${priorLabel}`}
              />
            ) : undefined
          }
        />
        <OpsMetric
          label="Booked revenue"
          value={revenue > 0 ? usdCompact(revenue) : DASH}
          // Projects won IN this window — the same basis as the money above
          // it. `closed` counts deals CREATED in the window that later won,
          // which is a different set and read as if it explained the figure.
          suffix={wonProjects > 0 ? `${wonProjects} project${wonProjects === 1 ? "" : "s"}` : undefined}
          sparkline={<Sparkline points={revenueSpark} tone="var(--ops-brand)" />}
        />
        <OpsMetric
          label="Blended CAC"
          value={DASH}
          unwired={{ tooltip: "Not wired — needs the spend store." }}
        />
      </div>

      <div className="mt-4 md:mt-6">
        <Callouts items={rankedCallouts} />
      </div>

      {/* The body grid. Asymmetric spans on purpose: the gauge is a single
          figure and needs less width than the eight market bars beside it.
          `items-stretch` plus `fill` on both cards is what makes the short
          gauge and the tall market list agree on height. */}
      <div className="mt-4 grid grid-cols-12 items-stretch gap-4 md:mt-6 md:gap-6">
        {pace && (
          <div className="col-span-12 xl:col-span-5">
            <OpsCard
              title="Pace"
              titleTooltip={`Through ${formatFreshness(SNAPSHOT_AS_OF)}`}
              fill
              ruled
            >
              <PaceGauge
                value={qualified}
                target={target}
                expected={pace.expected}
                footer={[
                  { label: "Qualified", value: qualified.toLocaleString("en-US") },
                  { label: "Expected", value: pace.expected.toLocaleString("en-US") },
                  {
                    label: "Target",
                    value: target.toLocaleString("en-US"),
                    tone: "muted",
                  },
                ]}
              />
            </OpsCard>
          </div>
        )}

        <div className={pace ? "col-span-12 xl:col-span-7" : "col-span-12"}>
          {/* CAPPED, NOT TRUNCATED. Eight rows are shown and the rest scroll
              inside a fixed viewport, so the card is the same height at 8
              markets as at 50 — the panel stops being a function of how many
              markets exist. The footer link is outside the scroll area so it
              never has to be scrolled to. */}
          <OpsCard
            title="Markets against pace"
            titleTooltip={`${expectedPerMarket} expected each · ${windowLabel}`}
            fill
            ruled
            footer={
              <Link href="/admin/markets" className="ops-foot-link">
                View all markets
              </Link>
            }
          >
            <div className="ops-scroll-8">
              <ProgressRows rows={marketRowsWorstFirst} />
            </div>
          </OpsCard>
        </div>

        <div className="col-span-12">
          <OpsCard title="Qualified by month" ruled>
            <QualifiedByMonth months={trendMonths} channels={chartLegend} />
          </OpsCard>
        </div>

        <div className="col-span-12">
          <ChannelsTable
            title="Channels"
            deltaLabel={priorLabel ? `vs ${priorLabel}` : "vs prior"}
            titleTooltip={
              latest ? `${attributedTotal} attributed of ${latest.total} qualified` : undefined
            }
            rows={channelRows}
          />
        </div>
      </div>
    </>
  );
}
