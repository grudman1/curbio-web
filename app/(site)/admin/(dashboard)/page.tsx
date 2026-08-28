import type { Metadata } from "next";
import Link from "next/link";
import { MARKETS } from "@/config/markets";
import {
  SNAPSHOT_AS_OF,
  SNAPSHOT_MONTHS,
  SNAPSHOT_DEALS,
  aggregateSnapshot,
  channelForDeal,
  qualifiedByMonthChannel,
} from "@/config/appLeadsSnapshot";
import {
  CHANNEL_FUNNEL_ORDER,
  CHANNEL_LABELS,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
} from "@/config/marketingHub";
import { CHANNEL_PLAN } from "@/config/channelPlan";
import type { Channel } from "@/lib/channels";
import { paceRead } from "@/app/(site)/marketing/(hub)/pacing";
import { TrendChart, type TrendMonth } from "@/app/(site)/marketing/(hub)/TrendChart";
import { readRecentLeads, recentCrmFailures } from "@/lib/adminLeads";
import { computeUndocumentedCampaigns } from "@/lib/campaignOrphans";
import { monthsFor, monthShort, parseTimeframe } from "../_ui/timeframe";
import { currentAdminUser } from "../_ui/session";
import { firstNameFrom } from "../_ui/userDisplay";
import { AskHero } from "./AskHero";
import {
  Card,
  StatCard,
  EmptyState,
  PageHeader,
  HealthDot,
  formatFreshness,
  inter,
  type Health,
} from "../_ui/v2";
import "../_ui/v2/tokens.css";

// ─────────────────────────────────────────────────────────────────────────────
// HOME — a briefing with an assistant on top, not a second analytics page.
//
// Analytics answers "why". Home answers "what changed, and what's broken".
// Nothing here may duplicate Performance, Markets or Attribution: the pace-by-
// market table lives on Markets, the full channel grid on Performance, the
// first-touch/last-touch control on Performance and Attribution only (gated in
// _ui/HeaderControls.tsx — it is an analysis control, not a global one).
//
// Top to bottom, ActiveCampaign's model: Ask hero → four StatCards → trend →
// channel movers → one health block. Every scattered "partially wired" badge
// on this screen collapses into that last block.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Home · Ops — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SCAN = 200;

/** Snapshot older than this many days stops being "current" and says so. */
const STALE_AFTER_DAYS = 10;

type MonthCut = { total: number; direct: number; byChannel: Partial<Record<Channel, number>> };

/** Deals in `month`, on or before `throughDay` of that month — i.e. the same
 *  calendar cutoff SNAPSHOT_AS_OF uses for the current month, applied to any
 *  month. Every row in SNAPSHOT_DEALS is Qualified by definition, so a plain
 *  count is the Qualified figure; `direct` is the same "no known channel" cut
 *  the unattributed-share stat uses. Comparing month-to-month through the same
 *  day-of-month is the only honest comparison while the current month is
 *  still partial. */
function qualifiedThrough(month: string, throughDay: number): MonthCut {
  let total = 0;
  let direct = 0;
  const byChannel: Partial<Record<Channel, number>> = {};
  for (const deal of SNAPSHOT_DEALS) {
    if (deal.month !== month) continue;
    if (Number(deal.date.slice(8, 10)) > throughDay) continue;
    total++;
    const channel = channelForDeal(deal);
    byChannel[channel] = (byChannel[channel] ?? 0) + 1;
    if (channel === "direct") direct++;
  }
  return { total, direct, byChannel };
}

/** Measured channel → the Magnificent Seven screen that owns it. `direct` and
 *  `referral` belong to no planning channel (config/channelPlan.ts), so their
 *  rows point at Attribution instead of inventing a page. */
const CHANNEL_HREF: Partial<Record<Channel, string>> = Object.fromEntries(
  CHANNEL_PLAN.flatMap((plan) => plan.channels.map((c) => [c, `/admin/channels/${plan.slug}`]))
);

function channelHref(channel: Channel): string {
  return CHANNEL_HREF[channel] ?? "/admin/attribution";
}

/** Whole days between two "YYYY-MM-DD" dates, UTC-safe (Date.parse of a bare
 *  ISO date is UTC midnight on both sides, so the difference is exact). */
function daysBetween(fromIso: string, toIso: string): number | null {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

const PACE_HEALTH: Record<"on" | "behind" | "risk", Health> = {
  on: "good",
  behind: "warn",
  risk: "bad",
};

export default async function TodayScreen({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS, "month");
  const months = monthsFor(tf, SNAPSHOT_MONTHS);

  // cache()d in session.ts — the layout already reads this in the same
  // request, so this is a shared Redis hit, not a second one.
  const me = await currentAdminUser();
  const firstName = firstNameFrom(me?.email ?? "");

  const agg = aggregateSnapshot(new Set(months));
  const perMarketTarget = QUALIFIED_TARGET_PER_MARKET_PER_MONTH * (months.length || 1);

  const companyQualified = MARKETS.reduce(
    (sum, m) =>
      sum + months.reduce((s, ym) => s + (agg.qualifiedByMarketMonth[`${m.slug}|${ym}`] ?? 0), 0),
    0
  );
  const companyTarget = perMarketTarget * MARKETS.length;
  const companyRead = paceRead(
    companyQualified,
    months,
    SNAPSHOT_AS_OF,
    QUALIFIED_TARGET_PER_MARKET_PER_MONTH * MARKETS.length
  );

  // ── the health block's four facts ─────────────────────────────────────────
  const leads = await readRecentLeads(SCAN);
  const leadRows = leads.configured && !leads.error ? leads.rows : [];
  const failures = recentCrmFailures(leadRows);
  const storeUnreadable = leads.configured && leads.error ? leads.error : null;
  const { orphans: campaignOrphans } = await computeUndocumentedCampaigns(SCAN);

  const directQualified = Object.entries(agg.cells).reduce(
    (sum, [key, cell]) => (key.split("|")[1] === "direct" ? sum + cell.qualified : sum),
    0
  );
  const unattributed = companyQualified > 0 ? directQualified / companyQualified : null;

  const snapshotAgeDays = daysBetween(SNAPSHOT_AS_OF, new Date().toISOString().slice(0, 10));

  // ── trend: every snapshot month (up to 12), stacked by channel ────────────
  const byMonthChannel = qualifiedByMonthChannel();
  const trendMonths: TrendMonth[] = SNAPSHOT_MONTHS.slice(-12).map((ym) => {
    const byChannel = byMonthChannel[ym] ?? {};
    return {
      ym,
      byChannel,
      total: Object.values(byChannel).reduce((s, v) => s + (v ?? 0), 0),
    };
  });

  // ── channel movers: biggest month-over-month change, same day-of-month cut
  // on both sides so a partial current month isn't compared to a full prior
  // one. Only the top four by absolute change — the full grid is Performance's.
  const asOfDay = Number(SNAPSHOT_AS_OF.slice(8, 10));
  const latestMonth = months[months.length - 1] ?? null;
  const latestIdx = latestMonth ? SNAPSHOT_MONTHS.indexOf(latestMonth) : -1;
  const priorMonth = latestIdx > 0 ? SNAPSHOT_MONTHS[latestIdx - 1] : null;
  const latestCut = latestMonth ? qualifiedThrough(latestMonth, asOfDay) : null;
  const priorCut = priorMonth ? qualifiedThrough(priorMonth, asOfDay) : null;

  const movers =
    latestCut && priorCut
      ? CHANNEL_FUNNEL_ORDER.map((c) => ({
          channel: c as Channel,
          delta: (latestCut.byChannel[c] ?? 0) - (priorCut.byChannel[c] ?? 0),
          now: latestCut.byChannel[c] ?? 0,
        }))
          .filter((r) => r.delta !== 0)
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
          .slice(0, 4)
      : [];
  const priorLabel = priorMonth ? monthShort(priorMonth) : null;

  const qualifiedHealth: Health = companyRead ? PACE_HEALTH[companyRead.state] : "unknown";
  const unattributedHealth: Health = unattributed === null ? "unknown" : unattributed >= 0.5 ? "warn" : "good";
  const deliveryHealth: Health = storeUnreadable ? "unknown" : failures.length > 0 ? "bad" : "good";
  const orphanHealth: Health = campaignOrphans.length > 0 ? "warn" : "good";
  const freshnessHealth: Health =
    snapshotAgeDays === null ? "unknown" : snapshotAgeDays > STALE_AFTER_DAYS ? "warn" : "good";

  const health: { key: string; dot: Health; text: string; href: string }[] = [
    {
      key: "unattributed",
      dot: unattributedHealth,
      text:
        unattributed === null
          ? "Unattributed share — no qualified leads in this timeframe"
          : `${Math.round(unattributed * 100)}% of qualified leads have no known channel`,
      href: "/admin/attribution",
    },
    {
      key: "orphans",
      dot: orphanHealth,
      text:
        campaignOrphans.length === 0
          ? "Every campaign tag producing leads is documented"
          : `${campaignOrphans.length} campaign tag${campaignOrphans.length === 1 ? "" : "s"} producing leads but undocumented`,
      href: "/admin/site/links",
    },
    {
      key: "delivery",
      dot: deliveryHealth,
      text: storeUnreadable
        ? `Lead store unreadable — ${storeUnreadable}`
        : failures.length === 0
          ? `No CRM delivery failures in the last 24 h — last ${SCAN} scanned`
          : `${failures.length} CRM delivery failure${failures.length === 1 ? "" : "s"} in the last 24 h`,
      href: "/admin/leads",
    },
    {
      key: "freshness",
      dot: freshnessHealth,
      text:
        snapshotAgeDays === null
          ? `App snapshot date unreadable — ${SNAPSHOT_AS_OF}`
          : snapshotAgeDays > STALE_AFTER_DAYS
            ? `App snapshot is ${snapshotAgeDays} days old — data through ${formatFreshness(SNAPSHOT_AS_OF)}`
            : `App snapshot current — data through ${formatFreshness(SNAPSHOT_AS_OF)}`,
      href: "/admin/settings",
    },
  ];

  return (
    <div className={`ui2 ${inter.variable} font-ui2`}>
      <PageHeader title="Home" freshness={`Data through ${formatFreshness(SNAPSHOT_AS_OF)}`} />

      <AskHero configured={Boolean(process.env.ANTHROPIC_API_KEY)} firstName={firstName} />

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Qualified leads"
          value={companyQualified.toLocaleString("en-US")}
          valueSuffix={`/ ${companyTarget.toLocaleString("en-US")}`}
          health={qualifiedHealth}
          note={
            companyRead
              ? `expected ${companyRead.expected.toLocaleString("en-US")} by ${formatFreshness(SNAPSHOT_AS_OF)}`
              : "no pace read for this timeframe"
          }
        />
        <StatCard
          label="Close rate"
          value="—"
          statusDot={{ tooltip: "Not wired — needs closed-won outcomes from the CRM." }}
        />
        <StatCard
          label="Revenue"
          value="—"
          statusDot={{ tooltip: "Not wired — needs booked revenue from the CRM." }}
        />
        <StatCard
          label="Blended CAC"
          value="—"
          statusDot={{ tooltip: "Not wired — needs the spend store." }}
        />
      </div>

      <div className="mt-4">
        <Card
          title="Qualified by month"
          headerHref="/admin/performance"
          right={
            <span className="font-ui2 text-ui2-caption text-ui2-gray-400">
              12 months · stacked by channel · Performance ›
            </span>
          }
        >
          <TrendChart months={trendMonths} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Channel movers"
          right={
            <span className="font-ui2 text-ui2-caption text-ui2-gray-400">
              {priorLabel ? `vs ${priorLabel}, same day of month` : "no prior month"}
            </span>
          }
        >
          {movers.length === 0 ? (
            <EmptyState
              icon="spark"
              headline={
                priorLabel
                  ? `No channel moved between ${priorLabel} and this month.`
                  : "No earlier month to compare this one against yet."
              }
            />
          ) : (
            <ul className="m-0 list-none p-0">
              {movers.map((m) => (
                <li key={m.channel} className="border-b border-ui2-divider last:border-b-0">
                  <Link
                    href={channelHref(m.channel)}
                    className="flex min-h-[44px] items-center gap-2.5 font-ui2 text-ui2-body text-ui2-text no-underline hover:text-ui2-accent"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {CHANNEL_LABELS[m.channel]}
                    </span>
                    <span
                      className={`flex-none font-ui2 text-ui2-body font-semibold tabular-nums ${
                        // Same rule DeltaChip encodes: the sign is always
                        // literal, only the colour knows which direction is
                        // good news. More `direct` is MORE unattributed — a
                        // rise there is not a win and must not read green.
                        m.delta > 0 === (m.channel !== "direct")
                          ? "text-ui2-green"
                          : "text-ui2-red"
                      }`}
                    >
                      {m.delta > 0 ? "+" : "−"}
                      {Math.abs(m.delta)}
                    </span>
                    <span className="flex-none font-ui2 text-ui2-caption tabular-nums text-ui2-gray-400">
                      vs {priorLabel}
                    </span>
                    <span aria-hidden className="flex-none text-ui2-gray-300">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Health">
          <ul className="m-0 list-none p-0">
            {health.map((h) => (
              <li key={h.key} className="border-b border-ui2-divider last:border-b-0">
                <Link
                  href={h.href}
                  className="flex min-h-[44px] items-center gap-2.5 font-ui2 text-ui2-body text-ui2-text no-underline hover:text-ui2-accent"
                >
                  <HealthDot health={h.dot} />
                  <span className="min-w-0 flex-1 truncate">{h.text}</span>
                  <span aria-hidden className="flex-none text-ui2-gray-300">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
