import type { Metadata } from "next";
import Link from "next/link";
import { MARKETS } from "@/config/markets";
import {
  SNAPSHOT_AS_OF,
  SNAPSHOT_MONTHS,
  SNAPSHOT_DEALS,
  aggregateSnapshot,
  channelForDeal,
} from "@/config/appLeadsSnapshot";
import { QUALIFIED_TARGET_PER_MARKET_PER_MONTH } from "@/config/marketingHub";
import { paceRead } from "@/app/(site)/marketing/(hub)/pacing";
import { readRecentLeads, recentCrmFailures } from "@/lib/adminLeads";
import { computeUndocumentedCampaigns } from "@/lib/campaignOrphans";
import { monthsFor, monthShort, parseTimeframe } from "../_ui/timeframe";
import {
  Card,
  StatCard,
  Table,
  Th,
  Tr,
  Td,
  EmptyState,
  PageHeader,
  ProgressBar,
  HealthDot,
  formatFreshness,
  inter,
  type Health,
} from "../_ui/v2";
import "../_ui/v2/tokens.css";

// ─────────────────────────────────────────────────────────────────────────────
// HOME — Phase 2 of the dashboard redesign (design-system brief, 2026-08-28).
// Rebuilt on the v2 primitives (../_ui/v2); every other /admin screen is
// untouched and still runs on the v1 system (DESIGN-APP.md). F-pattern:
// four StatCards → Pace by Market → Needs attention. No page-card grid, no
// prose — an explanation is a tooltip or it doesn't exist on this screen.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Home · Ops — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SCAN = 200;

/** Deals in `month`, on or before `throughDay` of that month — i.e. the same
 *  calendar cutoff SNAPSHOT_AS_OF uses for the current month, applied to the
 *  prior one. Every row in SNAPSHOT_DEALS is Qualified by definition, so a
 *  plain count is the Qualified figure; `direct` is the same "no known
 *  channel" cut the unattributed-share stat uses. */
function qualifiedThrough(month: string, throughDay: number): { total: number; direct: number } {
  let total = 0;
  let direct = 0;
  for (const deal of SNAPSHOT_DEALS) {
    if (deal.month !== month) continue;
    if (Number(deal.date.slice(8, 10)) > throughDay) continue;
    total++;
    if (channelForDeal(deal) === "direct") direct++;
  }
  return { total, direct };
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

  const agg = aggregateSnapshot(new Set(months));
  const perMarketTarget = QUALIFIED_TARGET_PER_MARKET_PER_MONTH * (months.length || 1);

  const rows = MARKETS.map((m) => {
    const qualified = months.reduce(
      (sum, ym) => sum + (agg.qualifiedByMarketMonth[`${m.slug}|${ym}`] ?? 0),
      0
    );
    const read = paceRead(qualified, months, SNAPSHOT_AS_OF, QUALIFIED_TARGET_PER_MARKET_PER_MONTH);
    return {
      key: m.slug,
      label: m.displayName,
      qualified,
      target: perMarketTarget,
      expected: read?.expected ?? null,
      state: read?.state ?? null,
    };
  });

  const companyQualified = rows.reduce((s, r) => s + (r.qualified ?? 0), 0);
  const companyTarget = perMarketTarget * MARKETS.length;
  const companyRead = paceRead(
    companyQualified,
    months,
    SNAPSHOT_AS_OF,
    QUALIFIED_TARGET_PER_MARKET_PER_MONTH * MARKETS.length
  );

  const underHalf = rows.filter((r) => r.state === "risk");
  const behind = rows.filter((r) => r.state === "behind");
  const onPace = rows.filter((r) => r.state === "on");

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

  // ── "vs same point last month" — same static snapshot, one month back,
  // cut at the same day-of-month SNAPSHOT_AS_OF uses. Null (renders as the
  // grey dash) whenever the current view isn't a single month, or there's no
  // earlier month with data to compare against.
  const asOfDay = Number(SNAPSHOT_AS_OF.slice(8, 10));
  const monthIdx = tf.kind === "month" ? SNAPSHOT_MONTHS.indexOf(tf.ym) : -1;
  const priorMonth = monthIdx > 0 ? SNAPSHOT_MONTHS[monthIdx - 1] : null;
  const prior = priorMonth ? qualifiedThrough(priorMonth, asOfDay) : null;
  const priorLabel = priorMonth ? `vs ${monthShort(priorMonth)}` : "vs last month";

  const qualifiedDelta = prior && prior.total > 0 ? (companyQualified - prior.total) / prior.total : null;
  const priorUnattributed = prior && prior.total > 0 ? prior.direct / prior.total : null;
  const unattributedDelta =
    unattributed !== null && priorUnattributed !== null && priorUnattributed > 0
      ? (unattributed - priorUnattributed) / priorUnattributed
      : null;

  const attention: { health: Health; text: string; href: string }[] = [];
  if (storeUnreadable) {
    attention.push({ health: "bad", text: `Lead store unreadable — ${storeUnreadable}`, href: "/admin/leads" });
  }
  if (failures.length) {
    attention.push({
      health: "bad",
      text: `${failures.length} CRM delivery failure${failures.length === 1 ? "" : "s"} in the last 24 h`,
      href: "/admin/leads",
    });
  }
  if (underHalf.length === 1) {
    attention.push({
      health: "bad",
      text: `${underHalf[0].label} is under half pace — ${underHalf[0].qualified}/${underHalf[0].target}`,
      href: "/admin/markets",
    });
  } else if (underHalf.length > 1) {
    attention.push({
      health: "bad",
      text: `${underHalf.length} of ${MARKETS.length} markets are under half pace`,
      href: "/admin/markets",
    });
  }
  if (unattributed !== null && unattributed >= 0.5) {
    attention.push({
      health: "warn",
      text: `${Math.round(unattributed * 100)}% of qualified leads have no known channel`,
      href: "/admin/attribution",
    });
  }
  if (campaignOrphans.length > 0) {
    attention.push({
      health: "warn",
      text: `${campaignOrphans.length} campaign tag${campaignOrphans.length === 1 ? "" : "s"} producing leads but undocumented`,
      href: "/admin/site/links",
    });
  }
  if (underHalf.length === 0 && behind.length > 0) {
    attention.push({
      health: "warn",
      text: `${behind.length} market${behind.length === 1 ? " is" : "s are"} behind pace`,
      href: "/admin/markets",
    });
  }

  const paceSorted = [...rows].sort((a, b) => {
    const order: Record<"risk" | "behind" | "on", number> = { risk: 0, behind: 1, on: 2 };
    if (a.state === null && b.state === null) return a.label.localeCompare(b.label);
    if (a.state === null) return 1;
    if (b.state === null) return -1;
    return order[a.state] - order[b.state] || a.label.localeCompare(b.label);
  });

  const marketsOnPaceHealth: Health = onPace.length === 0 ? "bad" : onPace.length === MARKETS.length ? "good" : "warn";
  const deliveryHealth: Health = storeUnreadable ? "unknown" : failures.length > 0 ? "bad" : "good";
  const unattributedHealth: Health = unattributed === null ? "unknown" : unattributed >= 0.5 ? "warn" : "good";
  const qualifiedHealth: Health = companyRead ? PACE_HEALTH[companyRead.state] : "unknown";

  return (
    <div className={`ui2 ${inter.variable} font-ui2`}>
      <PageHeader title="Home" freshness={`Data through ${formatFreshness(SNAPSHOT_AS_OF)}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Qualified leads"
          value={companyQualified.toLocaleString("en-US")}
          valueSuffix={`/ ${companyTarget.toLocaleString("en-US")}`}
          health={qualifiedHealth}
          delta={{ value: qualifiedDelta, label: priorLabel }}
        />
        <StatCard
          label="Unattributed share"
          value={unattributed === null ? "—" : `${Math.round(unattributed * 100)}%`}
          health={unattributedHealth}
          delta={{ value: unattributedDelta, label: priorLabel, goodDirection: "down" }}
        />
        <StatCard
          label="Delivery failures · 24h"
          value={storeUnreadable ? "—" : failures.length}
          health={deliveryHealth}
          note={storeUnreadable ? "store unreadable" : `of last ${SCAN} scanned`}
        />
        <StatCard
          label="Markets on pace"
          value={onPace.length}
          valueSuffix={`/${MARKETS.length}`}
          health={marketsOnPaceHealth}
        />
      </div>

      <div className="mt-4">
        <Card title="Pace by market" flush>
          <Table>
            <thead>
              <tr>
                <Th>Market</Th>
                <Th>Pace</Th>
                <Th align="right">Qualified</Th>
              </tr>
            </thead>
            <tbody>
              {paceSorted.map((r) => {
                const health: Health = r.state ? PACE_HEALTH[r.state] : "unknown";
                const pct = r.qualified !== null && r.target > 0 ? r.qualified / r.target : null;
                const expectedPct = r.expected !== null && r.target > 0 ? r.expected / r.target : null;
                return (
                  <Tr key={r.key}>
                    <Td weight="medium">
                      <Link href="/admin/markets" className="flex items-center gap-2 text-ui2-text no-underline hover:text-ui2-accent">
                        <HealthDot health={health} />
                        <span>{r.label}</span>
                      </Link>
                    </Td>
                    <Td className="w-64">
                      <ProgressBar value={pct} expected={expectedPct} health={health} />
                    </Td>
                    <Td align="right" weight="semibold">
                      {r.qualified === null ? "—" : r.qualified}
                      <span className="font-normal text-ui2-text-muted">/{r.target}</span>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>

      <div className="mt-4">
        <Card
          title="Needs attention"
          titleClassName="text-[14px]"
          right={
            <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-ui2-divider px-1.5 py-0.5 font-ui2 text-[11px] font-semibold tabular-nums text-ui2-text">
              {attention.length}
            </span>
          }
        >
          {attention.length === 0 ? (
            <EmptyState headline="Nothing is under half pace, no delivery failures in 24 hours, and attribution is holding." />
          ) : (
            <ul className="m-0 list-none p-0">
              {attention.slice(0, 5).map((a) => (
                <li key={a.text} className="border-b border-ui2-divider last:border-b-0">
                  <Link
                    href={a.href}
                    className="flex min-h-[44px] items-center gap-2.5 px-4 font-ui2 text-ui2-body text-ui2-text no-underline hover:text-ui2-accent"
                  >
                    <HealthDot health={a.health} />
                    <span className="min-w-0 flex-1 truncate">{a.text}</span>
                    <span aria-hidden className="flex-none text-ui2-gray-300">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
