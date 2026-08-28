"use client";

import { useState } from "react";
import { Drawer } from "@/app/(site)/admin/_ui/Drawer";
import { Disclosure } from "@/app/(site)/admin/_ui/Disclosure";
import { SegmentedControl } from "@/app/(site)/admin/_ui/SegmentedControl";
import { DASH, Eyebrow, Panel } from "@/app/(site)/admin/_ui/primitives";
import {
  CHANNEL_FUNNEL_ORDER,
  CHANNEL_LABELS,
  EMAIL_SPLIT_VIEWS,
  FUNNEL_STAGES,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
  REPORT_METRICS,
  ROW_DIMENSIONS,
  type ReportMetricKey,
  type RowDimension,
  DEFINITIONS_LINE,
} from "@/config/marketingHub";
import type { Channel } from "@/lib/channels";
import type { SnapshotAggregates, SourceBreakdownRow, CellAggregate } from "@/config/appLeadsSnapshot";
import type { AttributionMode } from "../timeframe";
import { OutlineBar } from "../hubUi";

// The grid: rows × channel columns, ONE metric at a time — nine columns × six
// numbers is a spreadsheet, not a view. Rows and metric are page-local
// controls; the TIMEFRAME and ATTRIBUTION MODE arrive from the layout header,
// which governs every Hub screen at once.
//
// Every cell is clickable: the shared right-side drawer breaks the cell down
// by the app's raw referral source (the nearest thing the snapshot has to a
// campaign), with the other metrics and the funnel. A grid you cannot click
// into is a poster, not a tool. The per-lead list — names, dates, links into
// the app — is honestly impossible from a PII-stripped snapshot; the drawer
// says so instead of pretending.

type Row = { key: string; label: string; sub?: string };

type Column = { key: string; label: string };

function columnsFor(emailSplit: boolean): Column[] {
  return CHANNEL_FUNNEL_ORDER.flatMap((c): Column[] => {
    if (c === "email" && emailSplit) {
      // A VIEW of the email channel, resolved from which webhook the event
      // came from (Instantly vs. ActiveCampaign) — never a tenth channel.
      return EMAIL_SPLIT_VIEWS.map((v) => ({ key: v.key, label: v.label }));
    }
    return [{ key: c, label: CHANNEL_LABELS[c] }];
  });
}

// "2026-08" → "Aug". Snapshot months are the app's created-date months.
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthShort(ym: string): string {
  return MONTH_ABBR[Number(ym.slice(5)) - 1] ?? ym;
}

function formatMetric(cell: CellAggregate, m: ReportMetricKey): { n: number | null; text: string | null } {
  switch (m) {
    case "qualified":
      return { n: cell.qualified, text: String(cell.qualified) };
    case "closed":
      return { n: cell.closed, text: String(cell.closed) };
    case "revenue":
      return {
        n: cell.revenue,
        text: cell.revenue ? `$${Math.round(cell.revenue).toLocaleString("en-US")}` : "$0",
      };
    case "close_rate":
      return cell.qualified
        ? { n: cell.closed / cell.qualified, text: `${Math.round((cell.closed / cell.qualified) * 100)}%` }
        : { n: null, text: null };
    default:
      return { n: null, text: null }; // engaged, cac — no source yet
  }
}

const TH = "whitespace-nowrap border-b border-app-border bg-app-well px-3 py-2 font-sans text-ops-micro font-bold uppercase text-content-subtle";
const TD = "border-b border-app-border px-3 py-2 font-sans text-ops-table";

export function ReportGrid({
  markets,
  hsms,
  agg,
  snapshotLabel,
  mode,
  tfLabel,
  barMonth,
  initialMetric,
  sourceBreakdowns,
  stale,
}: {
  markets: Row[];
  hsms: Row[];
  /** Aggregated over the header-selected timeframe's months only. */
  agg: SnapshotAggregates;
  snapshotLabel: string;
  /** From the header toggle. */
  mode: AttributionMode;
  /** Human label of the header timeframe ("Aug 2026", "YTD 2026"…). */
  tfLabel: string;
  /** Set only when the timeframe is a single month — the target bars render
   *  then and only then, so the grid never mixes two timeframes. */
  barMonth: string | null;
  /** Metric to open on (?m= from a funnel-stage click). */
  initialMetric?: ReportMetricKey;
  /** `${marketKey}|${channel}` → raw-referral-source rows (drawer content). */
  sourceBreakdowns: Record<string, SourceBreakdownRow[]>;
  /** Snapshot older than 7 days — provenance renders in warning colour. */
  stale: boolean;
}) {
  const [rowDim, setRowDim] = useState<RowDimension>("market");
  const [metric, setMetric] = useState<ReportMetricKey>(initialMetric ?? "qualified");
  const [emailSplit, setEmailSplit] = useState(false);
  const [selected, setSelected] = useState<{ row: string; col: string } | null>(null);

  const rows = rowDim === "market" ? markets : hsms;
  const columns = columnsFor(emailSplit);
  const metricLabel = REPORT_METRICS.find((m) => m.key === metric)!.label;
  const modeLabel = mode === "last" ? "last touch" : "first touch";

  const selectedRow = selected ? rows.find((r) => r.key === selected.row) : null;
  const selectedCol = selected ? columns.find((c) => c.key === selected.col) : null;
  const selectionValid = !!(selectedRow && selectedCol);

  // ── snapshot reads ────────────────────────────────────────────────────────
  // The snapshot can honestly answer: market rows × base channels × last
  // touch, for Qualified / Closed / Revenue / Close rate. Everything else
  // (HSM rows, first touch, the email opt-in/cold split, Engaged, CAC)
  // renders an em-dash because its source genuinely doesn't exist yet.
  function cellFor(rowKey: string, colKey: string): CellAggregate | null {
    if (rowDim !== "market" || mode !== "last") return null;
    if (colKey.startsWith("email_")) return null; // split views need webhooks
    return agg.cells[`${rowKey}|${colKey as Channel}`] ?? { qualified: 0, closed: 0, revenue: 0, funnel: [0, 0, 0, 0, 0, 0] };
  }

  function metricAt(rowKey: string, colKey: string): { n: number | null; text: string | null } {
    const cell = cellFor(rowKey, colKey);
    if (!cell) return { n: null, text: null };
    return formatMetric(cell, metric);
  }

  // ── totals ────────────────────────────────────────────────────────────────
  // Aggregated from the underlying cells, not summed from formatted values —
  // a close-rate total is closed/qualified over the whole row or column,
  // never an average of percentages.
  function sumCells(cells: (CellAggregate | null)[]): CellAggregate | null {
    const real = cells.filter((c): c is CellAggregate => c !== null);
    if (real.length === 0) return null;
    const out: CellAggregate = { qualified: 0, closed: 0, revenue: 0, funnel: [0, 0, 0, 0, 0, 0] };
    for (const c of real) {
      out.qualified += c.qualified;
      out.closed += c.closed;
      out.revenue += c.revenue;
      c.funnel.forEach((v, i) => (out.funnel[i] += v));
    }
    return out;
  }

  const rowTotals = new Map(
    rows.map((r) => [r.key, sumCells(columns.map((c) => cellFor(r.key, c.key)))])
  );
  const columnTotals = new Map(
    columns.map((c) => [c.key, sumCells(rows.map((r) => cellFor(r.key, c.key)))])
  );
  const grandTotal = sumCells(rows.map((r) => rowTotals.get(r.key) ?? null));

  // ── heat shade: proportional to the COLUMN max, subtle by design ──────────
  const columnMax = new Map(
    columns.map((c) => {
      let max = 0;
      for (const r of rows) {
        const { n } = metricAt(r.key, c.key);
        if (n !== null && n > max) max = n;
      }
      return [c.key, max];
    })
  );

  function heatFor(colKey: string, n: number | null): string | undefined {
    const max = columnMax.get(colKey) ?? 0;
    if (n === null || n <= 0 || max <= 0) return undefined;
    const frac = n / max;
    return `color-mix(in srgb, var(--color-brand) ${(frac * 11).toFixed(1)}%, transparent)`;
  }

  const provenance =
    rowDim === "market" && mode === "last"
      ? `${tfLabel} · ${snapshotLabel} · direct last`
      : `${tfLabel} · ${modeLabel} · direct last`;

  const drawerBreakdown = selectionValid
    ? sourceBreakdowns[`${selectedRow!.key}|${selectedCol!.key}`] ?? []
    : [];
  const drawerCell = selectionValid ? cellFor(selectedRow!.key, selectedCol!.key) : null;

  return (
    <>
      {/* ── controls ── */}
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="inline-flex items-center gap-2">
          <Eyebrow>Rows</Eyebrow>
          <SegmentedControl
            label="Rows"
            options={ROW_DIMENSIONS}
            value={rowDim}
            onChange={(k) => {
              setRowDim(k);
              setSelected(null);
            }}
          />
        </span>
        <span className="inline-flex items-center gap-2">
          <Eyebrow>Metric</Eyebrow>
          <SegmentedControl label="Metric" options={REPORT_METRICS} value={metric} onChange={setMetric} />
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2 font-sans text-ops-label font-semibold text-content-muted">
          <input
            type="checkbox"
            checked={emailSplit}
            onChange={(e) => {
              setEmailSplit(e.target.checked);
              setSelected(null);
            }}
            className="accent-[var(--color-brand)]"
          />
          Split email: opt-in / cold
        </label>
      </div>

      {/* PROSE BUDGET: the definitions, caveats and provenance all survive —
          in a collapsed disclosure, not as paragraphs above the numbers. */}
      <div className="mb-3 max-w-[860px]">
        <Disclosure summary="Why these numbers?">
          <p>
            Each cell is {metricLabel} for that {rowDim === "market" ? "market" : "HSM"} from that
            channel, by {modeLabel} attribution. {DEFINITIONS_LINE}
          </p>
          {emailSplit && (
            <p>
              The email split is a view resolved from the source webhook (ActiveCampaign = opt-in,
              Instantly = cold), not a separate channel — those webhooks don&apos;t exist yet, so
              the split columns render em-dashes.
            </p>
          )}
          {mode === "first" && (
            <p>
              The app&apos;s first-touch fields are empty (verified against its attribution
              export), so first-touch views render em-dashes until the contact store exists.
            </p>
          )}
          {rowDim === "market" && mode === "last" && (
            <p>
              Populated numbers cover {tfLabel}, Qualified-side only, from a one-time{" "}
              {snapshotLabel} — a point-in-time export, not a live sync. Channel attribution is the
              app&apos;s referral source, conservatively mapped; everything ambiguous is counted as
              direct. Cell shading is proportional to the column&apos;s largest value; click any
              cell for its breakdown.
            </p>
          )}
        </Disclosure>
      </div>

      {/* ── the grid ── */}
      <Panel
        flush
        title={`${metricLabel} by ${rowDim === "market" ? "market" : "HSM"} × channel`}
        right={
          <span
            className={`whitespace-nowrap font-sans text-ops-label ${
              stale ? "font-bold text-tone-warn-text" : "text-content-subtle"
            }`}
            title={stale ? "The snapshot is more than 7 days old — numbers have drifted." : undefined}
          >
            {provenance}
            {stale && " · STALE"}
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${TH} pl-ops-panel text-left`}>{rowDim === "market" ? "Market" : "HSM"}</th>
                {columns.map((c) => (
                  <th key={c.key} className={`${TH} text-right`}>
                    {c.label}
                  </th>
                ))}
                <th className={`${TH} border-l border-app-border pr-ops-panel text-right`}>All</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rowTotal = rowTotals.get(r.key) ?? null;
                const rowTotalMetric = rowTotal ? formatMetric(rowTotal, metric) : { n: null, text: null };
                return (
                  <tr key={r.key}>
                    <td className={`${TD} min-w-[190px] pl-ops-panel`}>
                      <div className="font-semibold text-content">{r.label}</div>
                      {r.sub && <div className="mt-px font-sans text-ops-label text-content-subtle">{r.sub}</div>}
                      {/* Target bars only when the header timeframe IS a
                          single month — the 50 target is per month, and a
                          YTD grid with this-month bars was two timeframes
                          in one view. */}
                      {rowDim === "market" && barMonth && (
                        <div className="mt-1">
                          {(() => {
                            const q = agg.qualifiedByMarketMonth[`${r.key}|${barMonth}`] ?? 0;
                            return (
                              <OutlineBar
                                fraction={q / QUALIFIED_TARGET_PER_MARKET_PER_MONTH}
                                label={`${q} of ${QUALIFIED_TARGET_PER_MARKET_PER_MONTH} Qualified in ${monthShort(barMonth)} · snapshot`}
                              />
                            );
                          })()}
                        </div>
                      )}
                    </td>
                    {columns.map((c) => {
                      const isSelected = selected?.row === r.key && selected?.col === c.key;
                      const { n, text } = metricAt(r.key, c.key);
                      const isZero = text === "0" || text === "$0";
                      return (
                        <td key={c.key} className={`${TD} p-0 text-right`}>
                          <button
                            type="button"
                            onClick={() => setSelected(isSelected ? null : { row: r.key, col: c.key })}
                            aria-pressed={isSelected}
                            aria-label={`${r.label} × ${c.label} — open breakdown`}
                            style={{ background: isSelected ? undefined : heatFor(c.key, n) }}
                            className={`min-w-[64px] w-full cursor-pointer rounded-sm border-0 px-2 py-3.5 text-right font-sans text-ops-table tabular-nums transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                              isSelected
                                ? "bg-accent-subtle shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
                                : "hover:bg-app-well"
                            } ${text !== null && !isZero ? "font-semibold text-content" : "text-content-subtle"}`}
                          >
                            {text ?? DASH}
                          </button>
                        </td>
                      );
                    })}
                    <td
                      className={`${TD} border-l border-app-border pr-ops-panel text-right font-bold tabular-nums ${
                        rowTotalMetric.text === null ? "text-content-subtle" : "text-content"
                      }`}
                    >
                      {rowTotalMetric.text ?? DASH}
                    </td>
                  </tr>
                );
              })}
              {/* totals row */}
              <tr>
                <td className={`${TD} border-b-0 border-t border-app-border pl-ops-panel font-bold`}>
                  All {rowDim === "market" ? "markets" : "HSMs"}
                </td>
                {columns.map((c) => {
                  const t = columnTotals.get(c.key) ?? null;
                  const m = t ? formatMetric(t, metric) : { n: null, text: null };
                  return (
                    <td
                      key={c.key}
                      className={`${TD} border-b-0 border-t border-app-border text-right font-bold tabular-nums ${
                        m.text === null ? "text-content-subtle" : "text-content"
                      }`}
                    >
                      {m.text ?? DASH}
                    </td>
                  );
                })}
                <td
                  className={`${TD} border-b-0 border-l border-t border-app-border pr-ops-panel text-right font-bold tabular-nums ${
                    grandTotal ? "text-content" : "text-content-subtle"
                  }`}
                >
                  {grandTotal ? formatMetric(grandTotal, metric).text ?? DASH : DASH}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── drill-down drawer ── */}
      <Drawer
        open={selectionValid}
        onClose={() => setSelected(null)}
        title={selectionValid ? `${selectedRow!.label} × ${selectedCol!.label}` : ""}
        width={430}
      >
        {selectionValid && (
          <>
            <p className="m-0 font-sans text-ops-label text-content-subtle">{provenance}</p>

            {/* the six metrics */}
            <div className="mt-4 flex flex-wrap gap-x-7 gap-y-4">
              {REPORT_METRICS.map((m) => {
                const v = drawerCell ? formatMetric(drawerCell, m.key) : { n: null, text: null };
                return (
                  <div key={m.key} className="min-w-[74px]">
                    <div
                      className={`font-sans text-[22px] font-semibold leading-none tabular-nums ${
                        v.text === null ? "text-content-subtle" : "text-content"
                      }`}
                    >
                      {v.text ?? DASH}
                    </div>
                    <div className="mt-1 font-sans text-ops-label text-content-muted">{m.label}</div>
                  </div>
                );
              })}
            </div>

            {/* by source — the campaign-ish dimension the snapshot has */}
            <div className="mt-6">
              <Eyebrow className="mb-2 block">By referral source</Eyebrow>
              {drawerBreakdown.length === 0 ? (
                <p className="m-0 font-sans text-ops-body leading-[1.6] text-content-muted">
                  {drawerCell
                    ? "No Qualified leads in this cell for the selected timeframe."
                    : "This view has no data source yet — see the page notes for what it needs."}
                </p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`${TH} text-left`}>Source</th>
                      <th className={`${TH} text-right`}>Qualified</th>
                      <th className={`${TH} text-right`}>Closed</th>
                      <th className={`${TH} text-right`}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawerBreakdown.map((s) => (
                      <tr key={s.source}>
                        <td className={`${TD} font-mono text-[12px]`}>{s.source}</td>
                        <td className={`${TD} text-right font-semibold tabular-nums`}>{s.qualified}</td>
                        <td className={`${TD} text-right tabular-nums ${s.closed ? "text-content" : "text-content-subtle"}`}>
                          {s.closed}
                        </td>
                        <td className={`${TD} text-right tabular-nums ${s.revenue ? "text-content" : "text-content-subtle"}`}>
                          {s.revenue ? `$${Math.round(s.revenue).toLocaleString("en-US")}` : "$0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* funnel */}
            {drawerCell && (
              <div className="mt-6">
                <Eyebrow className="mb-2 block">Funnel</Eyebrow>
                {FUNNEL_STAGES.map((stage, i) => {
                  const n = drawerCell.funnel[i];
                  const max = drawerCell.funnel[0] || 1;
                  return (
                    <div key={stage} className="flex items-center gap-2.5 py-[3px]">
                      <span className="w-[118px] flex-none font-sans text-ops-label text-content-muted">{stage}</span>
                      <span
                        aria-hidden
                        className="h-2 flex-none rounded-sm bg-brand/55"
                        style={{
                          width: `${(n / max) * 140}px`,
                          minWidth: n > 0 ? 3 : 0,
                          background: "color-mix(in srgb, var(--color-brand) 55%, transparent)",
                        }}
                      />
                      <span className="font-sans text-ops-label font-semibold tabular-nums">{n}</span>
                    </div>
                  );
                })}
                <p className="m-0 mt-2 font-sans text-ops-label leading-[1.5] text-content-subtle">
                  Cumulative reached-at-least counts. Closed = status Won only.
                </p>
              </div>
            )}

            {/* the honest limit */}
            <p className="m-0 mt-6 border-t border-app-border pt-3 font-sans text-ops-label leading-[1.6] text-content-muted">
              The contributing leads themselves — names, dates, campaigns, entry points, first vs
              last touch, links into the app — need the live app sync. The snapshot is
              PII-stripped and carries no lead ids, so this drawer shows everything it honestly
              can.
            </p>
          </>
        )}
      </Drawer>
    </>
  );
}
