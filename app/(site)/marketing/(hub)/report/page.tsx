import type { Metadata } from "next";
import { MARKETS } from "@/config/markets";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import {
  aggregateSnapshot,
  OTHER_MARKETS_KEY,
  OTHER_MARKETS_LABEL,
  SNAPSHOT_LABEL,
  SNAPSHOT_MONTHS,
} from "@/config/appLeadsSnapshot";
import { REPORT_METRICS, type ReportMetricKey } from "@/config/marketingHub";
import { monthsFor, parseAttribution, parseTimeframe, timeframeLabel } from "../timeframe";
import { HubPageHeader, NeedsBlock } from "../hubUi";
import { ReportGrid } from "./ReportGrid";

// ─────────────────────────────────────────────────────────────────────────────
// Report — rows (markets or HSMs) × the nine channels in funnel order, one
// metric at a time. The header's timeframe and attribution mode govern this
// page: the grid aggregates over exactly the selected months, and shows the
// per-month target bar ONLY when a single month is selected — never a YTD
// table with this-month progress bars under it.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Report · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.report;

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS);
  const mode = parseAttribution(sp.a);
  const months = monthsFor(tf, SNAPSHOT_MONTHS);
  // ?m= preselects the metric — how funnel-stage clicks land on the grid.
  const initialMetric = REPORT_METRICS.find((m) => m.key === sp.m)?.key as
    | ReportMetricKey
    | undefined;

  // Row dimensions derive from config/markets.ts — the only place a market is
  // named. HSM rows are the unique HSM names, each covering its markets.
  const markets: { key: string; label: string; sub?: string }[] = MARKETS.map((m) => ({
    key: m.slug,
    label: m.name,
  }));

  const hsmMarkets = new Map<string, string[]>();
  for (const m of MARKETS) {
    hsmMarkets.set(m.hsm.name, [...(hsmMarkets.get(m.hsm.name) ?? []), m.name]);
  }
  const hsms = [...hsmMarkets.entries()].map(([name, covers]) => ({
    key: name,
    label: name,
    sub: covers.join(" · "),
  }));

  // Interim Qualified data: the PII-stripped app snapshot, aggregated over
  // the selected timeframe's months only. App markets without landing pages
  // (SEA, SD) aggregate under one labeled row rather than pretending to be
  // markets.
  const agg = aggregateSnapshot(new Set(months));
  if (agg.marketKeys.includes(OTHER_MARKETS_KEY)) {
    markets.push({
      key: OTHER_MARKETS_KEY,
      label: OTHER_MARKETS_LABEL,
      sub: "app markets without landing pages",
    });
  }

  return (
    <>
      <HubPageHeader surface={surface} />
      <ReportGrid
        markets={markets}
        hsms={hsms}
        agg={agg}
        snapshotLabel={SNAPSHOT_LABEL}
        mode={mode}
        tfLabel={timeframeLabel(tf, SNAPSHOT_MONTHS)}
        barMonth={tf.kind === "month" ? tf.ym : null}
        initialMetric={initialMetric}
      />
      <NeedsBlock surface={surface} />
    </>
  );
}
