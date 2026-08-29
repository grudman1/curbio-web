import type { Metadata } from "next";
import { buildPageRegistry, type RegistryEntry } from "@/config/pageRegistry";
import { MARKETS } from "@/config/markets";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { computePageStats, previousWindow, type PageStatsResult } from "@/lib/pageStats";
import { PageCard } from "../../_ui/PageCard";
import { PageHeader } from "@/app/(site)/admin/_ui/v2/PageHeader";
import { OpsCard, OpsMetric, OpsDelta } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { EmptyState } from "@/app/(site)/admin/_ui/v2/EmptyState";
import { StatusBadge } from "@/app/(site)/admin/_ui/v2/HealthDot";
import { Table, Thead, Th, Tr, Td } from "@/app/(site)/admin/_ui/v2/DataTable";
import { bucketFor, dayRange, monthsFor, parseTimeframe, resampleNote, timeframeLabel } from "../../_ui/timeframe";

/** Em-dash for a value that does not exist. Never a zero. */
const DASH = "—";

// ─────────────────────────────────────────────────────────────────────────────
// Pages — the registry, as live previews with their real numbers attached.
//
// Day-grain (config/adminNav.ts): backed by Vercel Web Analytics and Redis
// leads, both of which have real day resolution, so 7d/30d/90d are honest here
// and no coercion happens.
//
// Ops v2: the header, the tiles, the group rules and the backlog are the
// design system's own components. Nothing on this screen explains itself in
// prose — a status is a badge, a caveat is a tooltip, an unwired number is a
// dot and an em-dash. The page previews stay: a card without its screenshot
// is a row, and the point of this screen is seeing the pages.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Pages · Ops — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SCAN = 500;

// Registry path → the concrete URL worth looking at. Per-market rows fold into
// their parent as a "×N" badge, N derived from MARKETS — never a literal.
function previewPlan(entries: RegistryEntry[]) {
  const cards: { entry: RegistryEntry; src: string | null; note?: string; variants?: number }[] = [];
  for (const e of entries) {
    if (e.status === "planned") continue;
    if (e.path.includes(":market")) {
      const parent = cards.find((c) => e.path.startsWith(`${c.entry.path}/m/`));
      if (parent) {
        parent.variants = MARKETS.length;
        continue;
      }
    }
    if (e.path.startsWith("/admin") || e.path === "/marketing") {
      cards.push({ entry: e, src: null, note: e.note });
      continue;
    }
    if (e.path === "/lp/sell") { cards.push({ entry: e, src: "/lp/sell/m/atlanta", note: "shown: atlanta variant" }); continue; }
    if (e.path === "/exp") { cards.push({ entry: e, src: "/exp/m/atlanta", note: "shown: atlanta variant" }); continue; }
    if (e.path === "/lp/:campaign/confirm") { cards.push({ entry: e, src: "/lp/sell/confirm?market=atlanta", note: "shown: sell/atlanta" }); continue; }
    // The homepage is being BUILT at /home-preview; the placeholder at / is not
    // worth previewing. One page, one card.
    if (e.path === "/") { cards.push({ entry: e, src: "/home-preview", note: e.note }); continue; }
    cards.push({ entry: e, src: e.path, note: e.note });
  }
  return cards;
}

const GROUP_LABEL: Record<string, string> = {
  site: "Site",
  campaigns: "Campaigns",
  internal: "Internal",
};

export default async function PagesScreen({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const sp = await searchParams;
  // Pages is day-grain (config/adminNav.ts) — so it opens on 30d, not on
  // the latest snapshot month.
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS, "day");
  const bucket = bucketFor(tf);
  const label = timeframeLabel(tf, SNAPSHOT_MONTHS);
  const resample = resampleNote(tf);

  const registry = buildPageRegistry();
  const cards = previewPlan(registry);
  const planned = registry.filter((e) => e.status === "planned");

  // Range: day kinds carry their own; month kinds resolve through months that
  // actually have data.
  const range = dayRange(tf);
  const months = monthsFor(tf, SNAPSHOT_MONTHS);
  const since = range ? range.since : months.length ? `${months[0]}-01` : null;
  const until = range ? range.until : new Date().toISOString().slice(0, 10);

  const paths = cards.map((c) => c.entry.path);

  // The previous equal-length window powers every tile's delta. Fetched
  // alongside, not after — one extra upstream call for the whole screen, and
  // null when there is no comparable prior period rather than a fake 0%.
  const prev = since ? previousWindow(since, until) : null;
  const [stats, prevStats]: [PageStatsResult | null, PageStatsResult | null] = await Promise.all([
    since ? computePageStats(paths, since, until, bucket, SCAN) : Promise.resolve(null),
    prev ? computePageStats(paths, prev.since, prev.until, bucket, SCAN) : Promise.resolve(null),
  ]);

  /**
   * Total across every page — null, never 0, when the source could not be
   * read.
   *
   * This was a real bug caught by an expired API token: the per-card figures
   * correctly showed em-dashes while the KPI tile above them read "0 views",
   * because `?? 0` inside a reduce turns "unknown" into "none" silently. A
   * broken analytics read must never render as "this site got no traffic".
   */
  const sum = (r: PageStatsResult | null, k: "views" | "leads"): number | null => {
    if (!r) return null;
    if (k === "views" && (!r.analyticsConfigured || r.analyticsError)) return null;
    const vals = Object.values(r.stats).map((s) => s[k]);
    if (vals.length === 0 || vals.every((v) => v === null)) return null;
    return vals.reduce<number>((a, v) => a + (v ?? 0), 0);
  };

  const totalViews = sum(stats, "views");
  const totalLeads = sum(stats, "leads");
  const prevViews = sum(prevStats, "views");
  const prevLeads = sum(prevStats, "leads");

  /** Ratio change vs the previous period. null when there is nothing to
   *  compare against — a delta from zero is not a percentage. */
  const delta = (now: number | null, before: number | null): number | null =>
    now === null || before === null || before === 0 ? null : (now - before) / before;

  /** Ratio → signed percentage, one decimal, for the delta pill. */
  const pct = (r: number | null): number | null => (r === null ? null : Math.round(r * 1000) / 10);

  const viewsKnown = totalViews !== null;

  const conversion =
    totalViews !== null && totalViews > 0 && totalLeads !== null && !stats?.leadsTruncated && totalLeads <= totalViews
      ? totalLeads / totalViews
      : null;
  const prevConversion =
    prevViews !== null && prevViews > 0 && prevLeads !== null && prevLeads <= prevViews
      ? prevLeads / prevViews
      : null;

  const live = registry.filter((e) => e.status === "live").length;
  const stub = registry.filter((e) => e.status === "stub").length;

  const grouped = ["site", "campaigns", "internal"].map((g) => ({
    group: g,
    cards: cards.filter((c) => c.entry.group === g),
  }));

  return (
    <>
      <PageHeader
        title="Pages"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {registry.length} pages · {label}
            {resample && <StatusBadge status={resample} tone="neutral" />}
            {stats?.analyticsError && <StatusBadge status="analytics unreadable" tone="error" />}
            {stats && !stats.analyticsConfigured && (
              <StatusBadge status="analytics not configured" tone="neutral" />
            )}
            {stats?.leadsTruncated && <StatusBadge status="partial range" tone="warning" />}
          </span>
        }
        right={
          <>
            <StatusBadge status={`${live} live`} tone="success" />
            <StatusBadge status={`${stub} stub`} tone="neutral" />
            <StatusBadge status={`${planned.length} planned`} tone="neutral" />
          </>
        }
      />

      {/* ── the four tiles ── */}
      <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-4">
        <OpsMetric
          label="Views"
          value={viewsKnown ? totalViews!.toLocaleString("en-US") : DASH}
          suffix={viewsKnown ? "Vercel" : undefined}
          unwired={
            viewsKnown
              ? undefined
              : {
                  tooltip: stats?.analyticsError
                    ? "Vercel Web Analytics could not be read — this is a read failure, not zero traffic."
                    : "Vercel Web Analytics is not configured in this environment.",
                }
          }
          badge={viewsKnown ? <OpsDelta value={pct(delta(totalViews, prevViews))} suffix="%" label="vs prev" /> : undefined}
        />
        <OpsMetric
          label="Leads"
          value={totalLeads === null ? DASH : totalLeads.toLocaleString("en-US")}
          suffix={stats?.leadsTruncated ? `last ${SCAN} · partial` : `last ${SCAN}`}
          unwired={
            totalLeads === null
              ? { tooltip: "The Redis lead store could not be read in this environment." }
              : undefined
          }
          badge={
            totalLeads === null ? undefined : (
              <OpsDelta value={pct(delta(totalLeads, prevLeads))} suffix="%" label="vs prev" />
            )
          }
        />
        <OpsMetric
          label="Conversion"
          value={conversion === null ? DASH : `${(conversion * 100).toFixed(2)}%`}
          suffix={conversion === null ? undefined : "leads ÷ views"}
          unwired={
            conversion === null
              ? {
                  tooltip: stats?.leadsTruncated
                    ? `Withheld: the lead scan (newest ${SCAN}) does not cover the whole timeframe, so the numerator is truncated.`
                    : "Needs both Vercel pageviews and a readable lead store for this timeframe.",
                }
              : undefined
          }
          badge={
            conversion === null ? undefined : (
              <OpsDelta value={pct(delta(conversion, prevConversion))} suffix="%" label="vs prev" />
            )
          }
        />
        <OpsMetric
          label="Unattributed share"
          value={DASH}
          unwired={{
            tooltip:
              "The share of Qualified leads with no known channel. Month-grain — it lives on the Attribution screen.",
          }}
        />
      </div>

      {/* ── the cards ── */}
      {grouped.map(({ group, cards: groupCards }) =>
        groupCards.length === 0 ? null : (
          <section key={group} className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="ops-eyebrow">{GROUP_LABEL[group] ?? group}</span>
              <span className="ops-subtle ops-tnum">{groupCards.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-ops-gap sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupCards.map((c) => (
                <PageCard
                  key={c.entry.path}
                  entry={c.entry}
                  src={c.src}
                  note={c.note}
                  variants={c.variants}
                  stat={stats?.stats[c.entry.path]}
                  bucket={bucket}
                  truncated={stats?.leadsTruncated ?? false}
                />
              ))}
            </div>
          </section>
        )
      )}

      {/* ── backlog ── */}
      <OpsCard
        title="Backlog"
        titleTooltip="Pages the site navigation links to that have no route behind them — derived from config/navigation.ts, so it maintains itself."
        control={<span className="ops-subtle ops-tnum">{planned.length}</span>}
        ruled
      >
        {planned.length === 0 ? (
          <EmptyState headline="Nothing in the nav points at a page that doesn't exist." />
        ) : (
          <Table>
            <Thead>
              <Th>Path</Th>
              <Th>Title</Th>
              <Th>Note</Th>
            </Thead>
            <tbody>
              {planned.map((e) => (
                <Tr key={e.path}>
                  <Td className="font-mono text-[12.5px]">{e.path}</Td>
                  <Td>{e.title}</Td>
                  <Td muted>{e.note ?? DASH}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </OpsCard>
    </>
  );
}
