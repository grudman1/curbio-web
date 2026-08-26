import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CHANNEL_PLAN, CHANNEL_PLAN_BY_SLUG } from "@/config/channelPlan";
import { SNAPSHOT_MONTHS, aggregateSnapshot } from "@/config/appLeadsSnapshot";
import { QUALIFIED_TARGET_PER_MARKET_PER_MONTH } from "@/config/marketingHub";
import { MARKETS } from "@/config/markets";
import { PageHeader } from "../../../_ui/AppShell";
import { ChannelBrief } from "../../../_ui/ChannelBrief";
import { monthsFor, parseTimeframe, timeframeLabel } from "../../../_ui/timeframe";

// One route, seven screens. Every Magnificent Seven channel resolves — the nav
// can never 404 into this group, and a channel with no data source yet renders
// a BRIEF (tier, owner, targets, needs) rather than an empty state.
//
// Month-grain: the only qualified-lead source today is the monthly app
// snapshot. A day option coerces and says so.

export function generateStaticParams() {
  return CHANNEL_PLAN.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const plan = CHANNEL_PLAN_BY_SLUG[slug];
  return {
    title: `${plan?.label ?? "Channel"} · Ops — Curbio`,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function ChannelScreen({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const { slug } = await params;
  const plan = CHANNEL_PLAN_BY_SLUG[slug];
  if (!plan) notFound();

  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS, "month");
  const months = monthsFor(tf, SNAPSHOT_MONTHS);
  const label = timeframeLabel(tf, SNAPSHOT_MONTHS);

  // Qualified leads attributable to THIS planning channel = the sum over the
  // measured channels it covers. A channel covering none (Events, Content)
  // gets null — not zero. That distinction is the whole point.
  // aggregateSnapshot keys cells as `${marketKey}|${channel}` and takes a month
  // SET — sum every market's cell for each measured channel this planning
  // channel covers.
  let qualified: number | null = null;
  if (plan.channels.length > 0 && months.length > 0) {
    const agg = aggregateSnapshot(new Set(months));
    const covered = new Set<string>(plan.channels);
    qualified = Object.entries(agg.cells).reduce(
      (sum, [key, cell]) => (covered.has(key.split("|")[1]) ? sum + cell.qualified : sum),
      0
    );
  }

  const companyTarget = QUALIFIED_TARGET_PER_MARKET_PER_MONTH * MARKETS.length * (months.length || 1);

  return (
    <>
      <PageHeader
        title={plan.label}
        subtitle={`${label} · ${MARKETS.length} markets`}
      />
      <ChannelBrief
        plan={plan}
        metrics={[
          {
            label: "Qualified",
            value: qualified,
            note: plan.channels.length ? `${label.toLowerCase()}` : "no channel value",
          },
          {
            label: "Share of target",
            value: qualified !== null && companyTarget > 0 ? qualified / companyTarget : null,
            format: (n) => `${(n * 100).toFixed(1)}%`,
            note: `of ${companyTarget.toLocaleString("en-US")} company target`,
          },
          { label: "Spend", value: null, note: "needs spend store" },
          { label: "CAC", value: null, note: "needs spend store" },
        ]}
      />
    </>
  );
}
