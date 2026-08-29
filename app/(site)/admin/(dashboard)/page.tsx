import type { Metadata } from "next";
import { MARKETS } from "@/config/markets";
import {
  SNAPSHOT_AS_OF,
  SNAPSHOT_MONTHS,
  SNAPSHOT_DEALS,
  aggregateSnapshot,
  channelForDeal,
  funnelOrdinal,
  isClosed,
  marketKeyForCode,
  type SnapshotDeal,
} from "@/config/appLeadsSnapshot";
import {
  CHANNEL_FUNNEL_ORDER,
  CHANNEL_LABELS,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
} from "@/config/marketingHub";
import { CHANNEL_PLAN } from "@/config/channelPlan";
import type { Channel } from "@/lib/channels";
import { paceRead } from "@/app/(site)/marketing/(hub)/pacing";
import {
  monthLabelFull,
  monthShort,
  monthsFor,
  parseAttribution,
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
  QualifiedByMonth,
  RangeTabs,
  Sparkline,
  channelLabel,
  formatFreshness,
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
// ── Everything here is measured ────────────────────────────────────────────
// Every figure comes from config/appLeadsSnapshot (the app export) through
// the same aggregation the Markets, Channels and Report screens use. Nothing
// is a placeholder. Where a metric has no source — Blended CAC needs the
// spend store, which does not exist yet — the card shows a hollow status dot
// and an em-dash, never an invented number and never a caption about it.
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

type MonthCut = {
  total: number;
  byChannel: Partial<Record<Channel, number>>;
  byMarket: Record<string, number>;
  meetings: Partial<Record<Channel, number>>;
  proposals: Partial<Record<Channel, number>>;
};

/** Deals in `month` on or before `throughDay`. Every row in the snapshot is
 *  Qualified by definition, so a count IS the Qualified figure. */
function cutMonth(month: string, throughDay: number): MonthCut {
  const out: MonthCut = { total: 0, byChannel: {}, byMarket: {}, meetings: {}, proposals: {} };
  for (const deal of SNAPSHOT_DEALS) {
    if (deal.month !== month) continue;
    if (Number(deal.date.slice(8, 10)) > throughDay) continue;
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

/** Qualified per month across the whole snapshot, for KPI sparklines. */
function monthlySeries(pick: (deals: SnapshotDeal[]) => number): SparkPoint[] {
  const byMonth = new Map<string, SnapshotDeal[]>();
  for (const d of SNAPSHOT_DEALS) {
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

/** Ranges the chart card offers. These are timeframe kinds parseTimeframe
 *  already understands, so the card control and the header control are one
 *  piece of state (`?t=`) rather than two that can disagree. Month-grain only
 *  — the snapshot is a monthly export and cannot answer a 7-day question. */
const RANGE_OPTIONS = [
  { value: "3m", label: "3 months" },
  { value: "12m", label: "12 months" },
  { value: "ytd", label: "Year to date" },
];

export default async function HomeScreen({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS, "month");
  const months = monthsFor(tf, SNAPSHOT_MONTHS);
  const attribution = parseAttribution(sp.a);
  // Which range pill reads as selected. Falls back to the month default when the
  // URL carries a specific month rather than one of the named ranges.
  const rangeValue = RANGE_OPTIONS.some((o) => o.value === sp.t) ? (sp.t as string) : "";

  // cache()d in session.ts — the layout reads this in the same request, so
  // this is a shared Redis hit rather than a second one.
  const me = await currentAdminUser();
  const firstName = firstNameFrom(me?.email ?? "");

  const agg = aggregateSnapshot(new Set(months));
  const asOfDay = Number(SNAPSHOT_AS_OF.slice(8, 10));

  // ── company pace over the selected window ────────────────────────────────
  const qualified = MARKETS.reduce(
    (sum, m) =>
      sum + months.reduce((s, ym) => s + (agg.qualifiedByMarketMonth[`${m.slug}|${ym}`] ?? 0), 0),
    0
  );
  const companyTargetPerMonth = QUALIFIED_TARGET_PER_MARKET_PER_MONTH * MARKETS.length;
  const target = companyTargetPerMonth * (months.length || 1);
  const pace = paceRead(qualified, months, SNAPSHOT_AS_OF, companyTargetPerMonth);

  // ── like-for-like cuts: latest month in view vs the month before it ──────
  const latestMonth = months[months.length - 1] ?? null;
  const latestIdx = latestMonth ? SNAPSHOT_MONTHS.indexOf(latestMonth) : -1;
  const priorMonth = latestIdx > 0 ? SNAPSHOT_MONTHS[latestIdx - 1] : null;
  // The as-of day only truncates the as-of month; any earlier month in view
  // is complete, so it is cut at its own full length.
  const isPartial = latestMonth === SNAPSHOT_AS_OF.slice(0, 7);
  const cutDay = isPartial ? asOfDay : 31;
  const latest = latestMonth ? cutMonth(latestMonth, cutDay) : null;
  const prior = priorMonth ? cutMonth(priorMonth, cutDay) : null;
  const priorLabel = priorMonth ? monthShort(priorMonth) : null;

  // ── KPI row ──────────────────────────────────────────────────────────────
  const closed = Object.values(agg.cells).reduce((s, c) => s + c.closed, 0);
  const revenue = Object.values(agg.cells).reduce((s, c) => s + c.revenue, 0);
  const closeRate = qualified > 0 ? closed / qualified : null;

  const qualifiedSpark = monthlySeries((d) => d.length);
  const closeRateSpark = monthlySeries((d) =>
    d.length ? d.filter(isClosed).length / d.length : 0
  );
  const revenueSpark = monthlySeries((d) =>
    d.filter(isClosed).reduce((s, x) => s + (x.value ?? 0), 0)
  );

  // Prior-month comparisons for the KPI deltas, on the same cut as above.
  const priorClosed = priorMonth
    ? SNAPSHOT_DEALS.filter((d) => d.month === priorMonth && isClosed(d)).length
    : null;
  const priorQualified = prior?.total ?? null;
  const latestClosed = latestMonth
    ? SNAPSHOT_DEALS.filter(
        (d) => d.month === latestMonth && Number(d.date.slice(8, 10)) <= cutDay && isClosed(d)
      ).length
    : 0;
  const qualifiedDelta =
    priorQualified && latest ? (latest.total - priorQualified) / priorQualified : null;
  const closeRateDelta =
    priorQualified && priorClosed !== null && priorQualified > 0 && latest && latest.total > 0
      ? latestClosed / latest.total - priorClosed / priorQualified
      : null;

  // ── the stacked chart: every snapshot month, by channel ──────────────────
  const trendMonths: TrendMonth[] = SNAPSHOT_MONTHS.slice(-12).map((ym) => {
    const cut = cutMonth(ym, 31);
    return {
      ym,
      label: monthShort(ym),
      breakdownTitle: monthLabelFull(ym),
      byChannel: cut.byChannel,
      total: cut.total,
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

  // ── markets against pace ────────────────────────────────────────────────
  // Every market, not a top-three: the shape of the set is the finding, and
  // eight bars carry it without a sentence. Measured against the same
  // prorated expectation the company total uses, so the parts and the whole
  // are computed identically.
  const expectedPerMarket = latestMonth
    ? (paceRead(0, [latestMonth], SNAPSHOT_AS_OF, QUALIFIED_TARGET_PER_MARKET_PER_MONTH)?.expected ?? 0)
    : 0;
  const marketRows: ProgressRow[] = MARKETS.map((m) => {
    const got = latest?.byMarket[m.slug] ?? 0;
    return {
      key: m.slug,
      name: MARKET_NAME.get(m.slug) ?? m.slug,
      sub: `${got} of ${expectedPerMarket}`,
      ratio: expectedPerMarket > 0 ? got / expectedPerMarket : 0,
      figure: expectedPerMarket > 0 ? `${Math.round((got / expectedPerMarket) * 100)}%` : "—",
      href: "/admin/markets",
      tone: "accent" as const,
    };
  }).sort((a, b) => b.ratio - a.ratio);

  // ── hero context ─────────────────────────────────────────────────────────
  const windowLabel = timeframeLabel(tf, SNAPSHOT_MONTHS);
  const scopeLabel = `Scope: ${windowLabel} · All markets`;
  const attributionLabel = attribution === "first" ? "First touch" : "Last touch";

  const worstMarket = marketRows[marketRows.length - 1];
  const suggestions = [
    {
      label: worstMarket ? `Why is ${worstMarket.name} behind?` : "Which market is furthest behind?",
      ink: "var(--ops-error-500)",
    },
    { label: "How much of this window is unattributed?", ink: "var(--ops-ch-direct)" },
    { label: "Which channel moved most?", ink: "var(--ops-accent)" },
    { label: "Draft the Monday pacing note", ink: "var(--ops-brand)" },
  ];


  return (
    <>
      <AskHero
        configured={Boolean(process.env.ANTHROPIC_API_KEY)}
        firstName={firstName}
        scopeLabel={scopeLabel}
        attributionLabel={attributionLabel}
        suggestions={suggestions}
      />

      {/* KPI row. Four equal tiles — the one thing on this screen that is a
          simple repeating unit, so it stays a simple repeating grid. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <OpsMetric
          label="Qualified leads"
          value={qualified.toLocaleString("en-US")}
          suffix={`/ ${target.toLocaleString("en-US")}`}
          sparkline={<Sparkline points={qualifiedSpark} />}
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
          sparkline={<Sparkline points={closeRateSpark} />}
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
          suffix={closed > 0 ? `${closed} won` : undefined}
          sparkline={<Sparkline points={revenueSpark} />}
        />
        <OpsMetric
          label="Blended CAC"
          value={DASH}
          unwired={{ tooltip: "Not wired — needs the spend store." }}
        />
      </div>

      {/* The body grid. Asymmetric spans on purpose: the gauge is a single
          figure and needs less width than the eight market bars beside it. */}
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6">
        {pace && (
          <div className="col-span-12 xl:col-span-5">
            <OpsCard
              title="Pace"
              meta={`through ${formatFreshness(SNAPSHOT_AS_OF)}`}
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
          <OpsCard
            title="Markets against pace"
            meta={`${windowLabel} · ${expectedPerMarket} expected each`}
            headerHref="/admin/markets"
            ruled
          >
            <ProgressRows rows={marketRows} />
          </OpsCard>
        </div>

        <div className="col-span-12">
          <OpsCard
            title="Qualified by month"
            control={<RangeTabs options={RANGE_OPTIONS} current={rangeValue} />}
            ruled
          >
            <QualifiedByMonth months={trendMonths} channels={chartLegend} />
          </OpsCard>
        </div>

        <div className="col-span-12">
          <ChannelsTable
            title={`Channels, ${windowLabel}`}
            deltaLabel={priorLabel ? `vs ${priorLabel}` : "vs prior"}
            meta={latest ? `${attributedTotal} attributed of ${latest.total} qualified` : ""}
            rows={channelRows}
          />
        </div>
      </div>
    </>
  );
}
