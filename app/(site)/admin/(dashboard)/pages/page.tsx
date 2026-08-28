import type { Metadata } from "next";
import { buildPageRegistry, type RegistryEntry } from "@/config/pageRegistry";
import { MARKETS } from "@/config/markets";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { computePageStats, previousWindow, type PageStatsResult } from "@/lib/pageStats";
import { PageHeader } from "../../_ui/AppShell";
import { PageCard } from "../../_ui/PageCard";
import { EmptyState } from "../../_ui/EmptyState";
import { InfoPopover } from "../../_ui/InfoPopover";
import { StatCard } from "../../_ui/StatCard";
import { Chip, DASH, Eyebrow, Panel } from "../../_ui/primitives";
import { bucketFor, dayRange, monthsFor, parseTimeframe, resampleNote, timeframeLabel } from "../../_ui/timeframe";

// ─────────────────────────────────────────────────────────────────────────────
// Pages — the registry, as live previews with their real numbers attached.
//
// Day-grain (config/adminNav.ts): backed by Vercel Web Analytics and Redis
// leads, both of which have real day resolution, so 7d/30d/90d are honest here
// and no coercion happens.
//
// Everything explanatory that used to be body copy is now a chip, a ⓘ or a
// one-line provenance string. No paragraph on this screen exceeds two lines.
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
          <span className="inline-flex items-center gap-1.5">
            {registry.length} pages · {label}
            {resample && <Chip tone="unknown">{resample}</Chip>}
            {stats?.analyticsError && <Chip tone="bad">analytics unreadable</Chip>}
            {stats && !stats.analyticsConfigured && <Chip tone="unknown">analytics not configured</Chip>}
            {stats?.leadsTruncated && <Chip tone="unknown">partial range</Chip>}
          </span>
        }
        right={
          <>
            <Chip tone="good">{live} live</Chip>
            <Chip tone="warn">{stub} stub</Chip>
            <Chip tone="unknown">{planned.length} planned</Chip>
          </>
        }
      />

      {/* ── the four tiles ── */}
      <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-4">
        <StatCard
          label="Views"
          value={totalViews}
          delta={delta(totalViews, prevViews)}
          note={
            stats?.analyticsError
              ? "Vercel read failed — not zero traffic"
              : !stats?.analyticsConfigured
                ? "analytics not configured"
                : `Vercel · ${label.toLowerCase()}`
          }
          info="Raw pageviews from Vercel Web Analytics across every page in the registry. GA4 is not wired yet, so there is no second source to compare against."
        />
        <StatCard
          label="Leads"
          value={totalLeads}
          delta={delta(totalLeads, prevLeads)}
          note={stats?.leadsTruncated ? `last ${SCAN} scanned — partial` : `last ${SCAN} scanned`}
          info={`Leads are read from the Redis store, newest ${SCAN} only. The store is capped, so a long timeframe can reach further back than the scan does — when that happens the range is labelled partial and conversion rates are withheld rather than reported wrong.`}
        />
        <StatCard
          label="Conversion"
          value={conversion}
          delta={delta(conversion, prevConversion)}
          format={(n) => `${(n * 100).toFixed(2)}%`}
          note={stats?.leadsTruncated ? "withheld — partial lead range" : "leads ÷ views"}
          info="Leads divided by Vercel pageviews. Withheld entirely when the lead scan does not cover the whole timeframe — a conversion rate computed on a truncated numerator is a wrong number stated confidently."
        />
        <StatCard
          label="Unattributed share"
          value={null}
          note="needs attribution wiring"
          info="The share of qualified leads arriving with no known channel. Lives on the Attribution screen, which is month-grain."
        />
      </div>

      {/* ── the cards ── */}
      {grouped.map(({ group, cards: groupCards }) =>
        groupCards.length === 0 ? null : (
          <section key={group} className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <Eyebrow>{GROUP_LABEL[group] ?? group}</Eyebrow>
              <span className="font-sans text-ops-micro tabular-nums text-content-subtle">
                {groupCards.length}
              </span>
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
      <Panel
        title="Backlog"
        right={
          <span className="inline-flex items-center gap-1.5">
            <InfoPopover label="What the backlog is" align="right">
              Pages the site navigation links to that have no route behind them. Derived from
              config/navigation.ts, so it maintains itself — a nav entry pointing at a page that
              does not exist is a page someone intends to build.
            </InfoPopover>
            <span className="font-sans text-ops-label tabular-nums text-content-subtle">
              {planned.length}
            </span>
          </span>
        }
      >
        {planned.length === 0 ? (
          <EmptyState headline="Nothing in the nav points at a page that doesn't exist." />
        ) : (
          <ul className="m-0 list-none p-0">
            {planned.map((e) => (
              <li
                key={e.path}
                className="flex h-ops-row items-center gap-3 border-b border-app-border last:border-b-0"
              >
                <span className="font-mono text-ops-label text-content">{e.path}</span>
                <span className="truncate font-sans text-ops-label text-content-muted">{e.title}</span>
                <span className="ml-auto truncate font-sans text-ops-micro text-content-subtle">
                  {e.note ?? DASH}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
