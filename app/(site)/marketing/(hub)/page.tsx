import type { Metadata } from "next";
import { MARKETS } from "@/config/markets";
import {
  HUB_SURFACE_BY_SLUG,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
} from "@/config/marketingHub";
import {
  aggregateSnapshot,
  funnelCounts,
  OTHER_MARKETS_KEY,
  qualifiedByMonthChannel,
  SNAPSHOT_AS_OF,
  SNAPSHOT_LABEL,
  SNAPSHOT_MONTHS,
  weeklyQualified,
} from "@/config/appLeadsSnapshot";
import { Meta, MUTED, Panel, SUBTLE, eyebrow } from "@/app/(site)/admin/(dashboard)/ui";
import { monthsFor, parseTimeframe, timeframeLabel, timeframeParam } from "./timeframe";
import { paceRead, paceSentence, type PaceRead } from "./pacing";
import { PaceArc, Sparkline, TargetBar } from "./charts";
import { TrendChart, type TrendMonth } from "./TrendChart";
import { FunnelStrip, type FunnelStage } from "./FunnelStrip";
import { AttributionHealthPanel } from "./AttributionHealth";
import { AlertsPanel, collectAlerts } from "./alerts";
import { monthLabel } from "./timeframe";
import { DASH, HubPageHeader, NeedsBlock, PACE_TONE } from "./hubUi";

// ─────────────────────────────────────────────────────────────────────────────
// Today — the default route and the screen that matters: are we going to hit
// 50 Qualified per market this month, and if not, where is it breaking?
//
// Top to bottom: the pacing strip (one card per market — the signature
// element), the company total, then trend, funnel, attribution health, and
// alerts as their build steps land. Everything reads the header timeframe.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Today · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.today;

const num: React.CSSProperties = {
  fontFamily: "var(--font-family-serif)",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
  color: "var(--color-text)",
  lineHeight: 1,
};

function PaceLine({ pace }: { pace: PaceRead | null }) {
  if (!pace) {
    return (
      <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "6px 0 0" }}>
        no coverage in this timeframe
      </p>
    );
  }
  return (
    <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, margin: "6px 0 0", lineHeight: 1.5 }}>
      expected {pace.expected} {pace.coverage} ·{" "}
      <strong style={{ color: PACE_TONE[pace.state] }}>{paceSentence(pace)}</strong>
    </p>
  );
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS);
  const months = monthsFor(tf, SNAPSHOT_MONTHS);
  const tfLabel = timeframeLabel(tf, SNAPSHOT_MONTHS);
  const agg = aggregateSnapshot(new Set(months));
  const weekly = weeklyQualified(12);
  const zeroWeeks = weekly.weekStarts.map(() => 0);

  const perMarketTarget = QUALIFIED_TARGET_PER_MARKET_PER_MONTH * months.length;

  const marketReads = MARKETS.map((m) => {
    const q = months.reduce(
      (sum, mo) => sum + (agg.qualifiedByMarketMonth[`${m.slug}|${mo}`] ?? 0),
      0
    );
    return {
      slug: m.slug,
      name: m.name,
      q,
      pace: paceRead(q, months, SNAPSHOT_AS_OF, QUALIFIED_TARGET_PER_MARKET_PER_MONTH),
      weeks: weekly.byMarket[m.slug] ?? zeroWeeks,
    };
  });

  const companyQ = marketReads.reduce((s, r) => s + r.q, 0);
  const companyPace = paceRead(
    companyQ,
    months,
    SNAPSHOT_AS_OF,
    QUALIFIED_TARGET_PER_MARKET_PER_MONTH * MARKETS.length
  );
  const otherQ = months.reduce(
    (sum, mo) => sum + (agg.qualifiedByMarketMonth[`${OTHER_MARKETS_KEY}|${mo}`] ?? 0),
    0
  );
  const companyWeeks = MARKETS.reduce(
    (acc, m) => acc.map((v, i) => v + (weekly.byMarket[m.slug]?.[i] ?? 0)),
    zeroWeeks
  );

  // ── c) trend: every snapshot month (up to 12), stacked by channel ─────────
  const byMonthChannel = qualifiedByMonthChannel();
  const trendMonths: TrendMonth[] = SNAPSHOT_MONTHS.slice(-12).map((ym) => {
    const byChannel = byMonthChannel[ym] ?? {};
    return {
      ym,
      byChannel,
      total: Object.values(byChannel).reduce((s, v) => s + (v ?? 0), 0),
    };
  });

  // ── d) funnel over the selected timeframe ─────────────────────────────────
  const funnel = funnelCounts(new Set(months));
  const stages: FunnelStage[] = [
    { label: "Engaged", count: null, reportMetric: "engaged" },
    { label: "Qualified", count: funnel[0], reportMetric: "qualified" },
    { label: "Meeting", count: funnel[2], reportMetric: "qualified" },
    { label: "Proposal", count: funnel[4], reportMetric: "qualified" },
    { label: "Closed", count: funnel[5], reportMetric: "closed" },
  ];
  const linkQuery = `t=${timeframeParam(tf)}${sp.a === "first" ? "&a=first" : ""}`;

  // ── f) alerts ─────────────────────────────────────────────────────────────
  const alertData = await collectAlerts();

  return (
    <>
      <HubPageHeader surface={surface} />

      {/* ── a) pacing strip — one card per market ── */}
      <section style={{ marginBottom: "var(--space-5)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: "var(--space-3)",
          }}
        >
          <p style={{ ...eyebrow }}>
            Pacing — Qualified vs {perMarketTarget || QUALIFIED_TARGET_PER_MARKET_PER_MONTH} per market
          </p>
          <Meta>
            {tfLabel} · {SNAPSHOT_LABEL} · tick = expected to date · trend = 12 weeks
          </Meta>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {marketReads.map((r) => {
            const tone = r.pace ? PACE_TONE[r.pace.state] : "var(--color-border)";
            return (
              <article
                key={r.slug}
                style={{
                  background: "var(--color-surface-raised)",
                  border: `1px solid color-mix(in srgb, ${tone} 42%, var(--color-border))`,
                  borderLeft: `3px solid ${tone}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "14px 16px 12px",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-family-sans)",
                    fontSize: "var(--text-small)",
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--color-text)",
                  }}
                >
                  {r.name}
                </h2>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ ...num, fontSize: 38 }}>{r.q}</span>
                    <span style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE }}>
                      / {perMarketTarget || DASH}
                    </span>
                  </div>
                  <PaceArc
                    value={r.q}
                    target={perMarketTarget}
                    expected={r.pace?.expected ?? null}
                    state={r.pace?.state ?? null}
                    width={84}
                  />
                </div>
                <PaceLine pace={r.pace} />
                <div style={{ marginTop: 10, borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                  <Sparkline values={r.weeks} width={180} height={24} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── b) company total ── */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Panel
          title="Company"
          right={
            <Meta>
              {tfLabel} · {SNAPSHOT_LABEL}
            </Meta>
          }
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, flex: "none" }}>
              <span style={{ ...num, fontSize: 44 }}>{companyQ}</span>
              <span style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: SUBTLE }}>
                / {perMarketTarget * MARKETS.length || DASH} ({MARKETS.length} markets ×{" "}
                {perMarketTarget || QUALIFIED_TARGET_PER_MARKET_PER_MONTH})
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 220, paddingBottom: 8 }}>
              <TargetBar
                value={companyQ}
                target={perMarketTarget * MARKETS.length}
                expected={companyPace?.expected ?? null}
                state={companyPace?.state ?? null}
              />
            </div>
            <div style={{ flex: "none", paddingBottom: 2 }}>
              <Sparkline values={companyWeeks} width={160} height={30} />
            </div>
          </div>
          <PaceLine pace={companyPace} />
          {otherQ > 0 && (
            <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "8px 0 0" }}>
              + {otherQ} Qualified in app markets without landing pages — not counted toward
              the target.
            </p>
          )}
        </Panel>
      </div>

      {/* ── c) trend — 12 months, stacked by channel ── */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Panel
          title="Qualified by month"
          right={
            <Meta>
              all markets · stacked by channel · last touch · {SNAPSHOT_LABEL}
            </Meta>
          }
        >
          <TrendChart months={trendMonths} />
        </Panel>
      </div>

      {/* ── d) funnel — where it narrows, click through to the grid ── */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Panel
          title="Funnel"
          right={
            <Meta>
              {tfLabel} · {SNAPSHOT_LABEL}
            </Meta>
          }
        >
          <FunnelStrip stages={stages} query={linkQuery} />
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0", lineHeight: 1.6 }}>
            Cumulative reached-at-least counts across ALL app markets, including those
            without landing pages — which is why Qualified here can exceed the company
            total above. Closed = status Won only. Engaged has no wired source yet — its
            stage and conversion stay em-dashes, never zeros. Each stage opens the Report
            grid on the matching metric.
          </p>
        </Panel>
      </div>

      {/* ── e) attribution health — the honest panel ── */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <AttributionHealthPanel months={months} tfLabel={tfLabel} />
      </div>

      {/* ── f) alerts — part of the dashboard, not a page-top interruption ── */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <AlertsPanel
          {...alertData}
          currentMonthLabel={monthLabel(SNAPSHOT_MONTHS[SNAPSHOT_MONTHS.length - 1] ?? "")}
        />
      </div>

      <NeedsBlock surface={surface} />
    </>
  );
}
