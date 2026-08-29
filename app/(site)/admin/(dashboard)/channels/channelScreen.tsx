import { notFound } from "next/navigation";
import { CHANNEL_PLAN_BY_SLUG } from "@/config/channelPlan";
import { SNAPSHOT_MONTHS, aggregateSnapshot } from "@/config/appLeadsSnapshot";
import { mergedSnapshotDeals } from "@/lib/leadStore";
import { QUALIFIED_TARGET_PER_MARKET_PER_MONTH } from "@/config/marketingHub";
import { MARKETS } from "@/config/markets";
import { PageHeader } from "../../_ui/v2/PageHeader";
import { ChannelBrief, ChannelChips, ChannelTierBadge } from "../../_ui/ChannelBrief";
import { monthsFor, parseTimeframe, timeframeLabel } from "../../_ui/timeframe";

// The channel screen, shared by the dynamic [slug] route and by Partnerships,
// which needs its own static route because it carries tabs and a static
// segment shadows the dynamic one.
//
// Four tiles, of which two (Spend, CAC) have no source and say so with a
// hollow dot and an em-dash — the same treatment Home's Blended CAC uses.
// Nothing on this screen explains itself in prose; what needs qualifying is a
// tooltip (see _ui/ChannelBrief.tsx).

/** Em-dash for a value that does not exist. */
const DASH = "—";

export async function ChannelScreen({
  slug,
  searchParams,
  children,
}: {
  slug: string;
  searchParams: Promise<{ t?: string; a?: string }>;
  children?: React.ReactNode;
}) {
  const plan = CHANNEL_PLAN_BY_SLUG[slug];
  if (!plan) notFound();

  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS, "month");
  const months = monthsFor(tf, SNAPSHOT_MONTHS);
  const label = timeframeLabel(tf, SNAPSHOT_MONTHS);

  // Qualified attributable to this PLANNING channel = the sum over the
  // measured channels it covers. A channel covering none (Events, Content)
  // gets null, not zero — that distinction is the whole point.
  let qualified: number | null = null;
  if (plan.channels.length > 0 && months.length > 0) {
    // The merged store (import + post-snapshot live leads) — the same read
    // Home, Attribution and Performance make, so the surfaces agree.
    const agg = aggregateSnapshot(new Set(months), "all", await mergedSnapshotDeals());
    const covered = new Set<string>(plan.channels);
    qualified = Object.entries(agg.cells).reduce(
      (sum, [key, cell]) => (covered.has(key.split("|")[1]) ? sum + cell.qualified : sum),
      0
    );
  }

  const companyTarget =
    QUALIFIED_TARGET_PER_MARKET_PER_MONTH * MARKETS.length * (months.length || 1);
  const share = qualified !== null && companyTarget > 0 ? qualified / companyTarget : null;

  // Why a channel has no Qualified number of its own: it is not measured by
  // channel at all. The plan's own sentence carries it on hover.
  const notByChannel =
    plan.basisNote ??
    `Not wired — ${plan.label} is not measured by channel; it is attributed elsewhere.`;

  return (
    <>
      <PageHeader
        title={plan.label}
        subtitle={`${label} · ${MARKETS.length} markets`}
        badge={<ChannelTierBadge plan={plan} />}
        right={<ChannelChips plan={plan} />}
      />
      <ChannelBrief
        plan={plan}
        metrics={[
          {
            label: "Qualified",
            value: qualified === null ? DASH : qualified.toLocaleString("en-US"),
            suffix: qualified === null ? undefined : label.toLowerCase(),
            unwired: qualified === null ? { tooltip: notByChannel } : undefined,
          },
          {
            label: "Share of target",
            value: share === null ? DASH : `${(share * 100).toFixed(1)}%`,
            suffix: `of ${companyTarget.toLocaleString("en-US")} target`,
            unwired: share === null ? { tooltip: notByChannel } : undefined,
          },
          {
            label: "Spend",
            value: DASH,
            unwired: { tooltip: "Not wired — needs the spend store." },
          },
          {
            label: "CAC",
            value: DASH,
            unwired: { tooltip: "Not wired — needs the spend store." },
          },
        ]}
      >
        {children}
      </ChannelBrief>
    </>
  );
}
