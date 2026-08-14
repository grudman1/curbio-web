import type { Metadata } from "next";
import { MARKETS } from "@/config/markets";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import {
  aggregateSnapshot,
  OTHER_MARKETS_KEY,
  OTHER_MARKETS_LABEL,
  SNAPSHOT_LABEL,
} from "@/config/appLeadsSnapshot";
import { HubPageHeader, NeedsBlock } from "../hubUi";
import { ReportGrid } from "./ReportGrid";

// ─────────────────────────────────────────────────────────────────────────────
// Report — the view that matters. Rows (markets or HSMs) × the nine channels
// in funnel order, one metric at a time. All structure, no numbers: every
// toggle works and re-labels the grid; only the values are absent until the
// wiring lands (see the needs block).
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Marketing · Report · Control Room — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.report;

export default function ReportPage() {
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

  // Interim Qualified data: the PII-stripped app snapshot. Aggregated on the
  // server; the grid receives plain numbers. App markets without landing
  // pages (SEA, SD) aggregate under one labeled row rather than pretending
  // to be markets.
  const agg = aggregateSnapshot();
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
      <ReportGrid markets={markets} hsms={hsms} agg={agg} snapshotLabel={SNAPSHOT_LABEL} />
      <NeedsBlock surface={surface} />
    </>
  );
}
