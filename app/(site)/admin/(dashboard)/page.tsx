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
  Blockers,
  Card,
  ChannelsTable,
  PacingStrip,
  QualifiedByMonth,
  StatCard,
  channelLabel,
  formatFreshness,
  type Blocker,
  type ChannelLegend,
  type ChannelRow,
  type Health,
  type SparkPoint,
  type TrendMonth,
} from "../_ui/v2";
import "../_ui/v2/tokens.css";

// ─────────────────────────────────────────────────────────────────────────────
// HOME — the approved 2026 redesign.
//
// Six sections, top to bottom: the ask hero, the pacing strip, what's in the
// way, the KPI row, qualified-by-month, and the channel table. Analytics
// answers "why"; Home answers "where are we, and what is costing us the
// most".
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

const PACE_HEALTH: Record<"on" | "behind" | "risk", Health> = {
  on: "good",
  behind: "warn",
  risk: "bad",
};

const MARKET_NAME = new Map(MARKETS.map((m) => [m.slug, m.displayName]));

export default async function HomeScreen({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS, "month");
  const months = monthsFor(tf, SNAPSHOT_MONTHS);
  const attribution = parseAttribution(sp.a);

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

  // ── "What's in the way": ranked by leads at stake ───────────────────────
  const blockers: (Blocker & { atStake: number })[] = [];

  if (latest && latest.total > 0) {
    const unattributed = latest.byChannel.direct ?? 0;
    if (unattributed > 0) {
      const share = unattributed / latest.total;
      const priorShare = prior && prior.total > 0 ? (prior.byChannel.direct ?? 0) / prior.total : null;
      blockers.push({
        key: "unattributed",
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

  // Per-market shortfall against the same prorated expectation the company
  // total uses, so the parts and the whole are measured the same way.
  if (latestMonth) {
    const expectedPerMarket =
      paceRead(0, [latestMonth], SNAPSHOT_AS_OF, QUALIFIED_TARGET_PER_MARKET_PER_MONTH)?.expected ?? 0;
    const shortfalls = MARKETS.map((m) => {
      const got = latest?.byMarket[m.slug] ?? 0;
      return {
        slug: m.slug,
        name: MARKET_NAME.get(m.slug) ?? m.slug,
        got,
        short: expectedPerMarket - got,
        delta: prior ? got - (prior.byMarket[m.slug] ?? 0) : null,
      };
    })
      .filter((r) => r.short > 0)
      .sort((a, b) => b.short - a.short)
      .slice(0, 2);

    for (const s of shortfalls) {
      blockers.push({
        key: `market-${s.slug}`,
        title: `${s.name} is ${s.short} behind pace`,
        delta: s.delta,
        goodDirection: "up",
        href: `/admin/markets`,
        linkLabel: "Markets",
        atStake: s.short,
      });
    }
  }

  // Largest attributed-channel decline.
  if (latest && prior) {
    const drops = attributedChannels
      .map((c) => ({ c, drop: (prior.byChannel[c] ?? 0) - (latest.byChannel[c] ?? 0) }))
      .filter((r) => r.drop > 0)
      .sort((a, b) => b.drop - a.drop);
    const worst = drops[0];
    if (worst) {
      blockers.push({
        key: `channel-${worst.c}`,
        title: `${CHANNEL_LABELS[worst.c]} is down ${worst.drop} qualified, the largest attributed drop`,
        delta: -worst.drop,
        goodDirection: "up",
        href: CHANNEL_HREF[worst.c] ?? "/admin/attribution",
        linkLabel: CHANNEL_LABELS[worst.c],
        atStake: worst.drop,
      });
    }
  }

  const rankedBlockers = blockers.sort((a, b) => b.atStake - a.atStake).slice(0, 3);

  // ── hero context ─────────────────────────────────────────────────────────
  const windowLabel = timeframeLabel(tf, SNAPSHOT_MONTHS);
  const scopeLabel = `Scope: ${windowLabel} · All markets`;
  const attributionLabel = attribution === "first" ? "First touch" : "Last touch";

  const worstMarket = rankedBlockers.find((b) => b.key.startsWith("market-"));
  const suggestions = [
    worstMarket
      ? { label: `Why is ${worstMarket.title.split(" is ")[0]} behind?`, ink: "var(--ui2-red)" }
      : { label: "Which market is furthest behind?", ink: "var(--ui2-red)" },
    { label: "How much of this window is unattributed?", ink: "var(--ui2-ch-direct)" },
    { label: "Which channel moved most?", ink: "var(--ui2-amber)" },
    { label: "Draft the Monday pacing note", ink: "var(--ui2-accent)" },
  ];

  const cutNote = isPartial ? `${monthShort(SNAPSHOT_AS_OF.slice(0, 7))} 1–${asOfDay}` : windowLabel;
  const priorNote = priorLabel ? `${priorLabel} 1–${isPartial ? asOfDay : 31}` : null;

  return (
    <div className="ui2 font-ui2">
      <AskHero
        configured={Boolean(process.env.ANTHROPIC_API_KEY)}
        firstName={firstName}
        scopeLabel={scopeLabel}
        attributionLabel={attributionLabel}
        suggestions={suggestions}
      />

      <div className="flex flex-col gap-4">
        {pace && (
          <PacingStrip
            label={`Qualified · ${windowLabel} · through ${formatFreshness(SNAPSHOT_AS_OF)}`}
            value={qualified}
            target={target}
            expected={pace.expected}
            delta={pace.delta}
          />
        )}

        <Blockers
          items={rankedBlockers}
          meta={
            priorNote
              ? `ranked by leads at stake · ${cutNote} vs ${priorNote}`
              : `ranked by leads at stake · ${cutNote}`
          }
        />

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard
            label="Qualified leads"
            value={qualified.toLocaleString("en-US")}
            valueSuffix={`/ ${target.toLocaleString("en-US")}`}
            health={pace ? PACE_HEALTH[pace.state] : "unknown"}
            sparkline={qualifiedSpark}
            delta={
              priorLabel
                ? { value: qualifiedDelta, label: `vs ${priorLabel}`, goodDirection: "up" }
                : undefined
            }
          />
          <StatCard
            label="Close rate"
            value={closeRate === null ? DASH : `${(closeRate * 100).toFixed(1)}%`}
            health={closeRate === null ? "unknown" : "good"}
            sparkline={closeRateSpark}
            delta={
              priorLabel
                ? { value: closeRateDelta, label: `vs ${priorLabel}`, goodDirection: "up" }
                : undefined
            }
          />
          <StatCard
            label="Booked revenue"
            value={revenue > 0 ? usdCompact(revenue) : DASH}
            valueSuffix={closed > 0 ? `${closed} won` : undefined}
            health={revenue > 0 ? "good" : "unknown"}
            sparkline={revenueSpark}
          />
          <StatCard
            label="Blended CAC"
            value={DASH}
            statusDot={{ tooltip: "Not wired — needs the spend store." }}
          />
        </div>

        <Card
          title="Qualified by month"
          headerHref="/admin/performance"
          right={
            <span className="font-ui2 text-ui2-caption text-ui2-gray-400">
              {trendMonths.length} months · Performance ›
            </span>
          }
        >
          <QualifiedByMonth months={trendMonths} channels={chartLegend} />
        </Card>

        <ChannelsTable
          title={`Channels, ${windowLabel}`}
          deltaLabel={priorLabel ? `vs ${priorLabel}` : "vs prior"}
          meta={
            latest ? `${attributedTotal} attributed of ${latest.total} qualified` : ""
          }
          rows={channelRows}
        />
      </div>
    </div>
  );
}
