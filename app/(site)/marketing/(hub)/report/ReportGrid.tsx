"use client";

import { useEffect, useState } from "react";
import { MUTED, Panel, SUBTLE, eyebrow } from "@/app/(site)/admin/(dashboard)/ui";
import {
  CHANNEL_FUNNEL_ORDER,
  CHANNEL_LABELS,
  EMAIL_SPLIT_VIEWS,
  FUNNEL_STAGES,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
  REPORT_METRICS,
  ROW_DIMENSIONS,
  type ReportMetricKey,
  type RowDimension, DEFINITIONS_LINE } from "@/config/marketingHub";
import type { Channel } from "@/lib/channels";
import type { SnapshotAggregates, SourceBreakdownRow, CellAggregate } from "@/config/appLeadsSnapshot";
import type { AttributionMode } from "../timeframe";
import { DASH, OutlineBar, td, th } from "../hubUi";

// The grid: rows × channel columns, ONE metric at a time — nine columns × six
// numbers is a spreadsheet, not a view. Rows and metric are page-local
// controls; the TIMEFRAME and ATTRIBUTION MODE arrive from the layout header,
// which governs every Hub screen at once.
//
// Every cell is clickable: a right-side drawer breaks the cell down by the
// app's raw referral source (the nearest thing the snapshot has to a
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

// ── Small segmented control, tool-shaped ─────────────────────────────────────

function Seg<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ ...eyebrow }}>{label}</span>
      <div
        role="group"
        aria-label={label}
        style={{
          display: "inline-flex",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-pill)",
          overflow: "hidden",
        }}
      >
        {options.map((o) => {
          const active = o.key === value;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.key)}
              style={{
                fontFamily: "var(--font-family-sans)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.02em",
                padding: "5px 12px",
                border: 0,
                cursor: "pointer",
                background: active ? "var(--color-text)" : "transparent",
                color: active ? "var(--color-surface-raised, #fff)" : MUTED,
                transition: "background var(--duration-base) ease-out",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
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

  // Escape closes the drawer.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

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
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "12px 24px",
          marginBottom: "var(--space-3)",
        }}
      >
        <Seg label="Rows" options={ROW_DIMENSIONS} value={rowDim} onChange={(k) => { setRowDim(k); setSelected(null); }} />
        <Seg label="Metric" options={REPORT_METRICS} value={metric} onChange={setMetric} />
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontFamily: "var(--font-family-sans)",
            fontSize: 12,
            fontWeight: 600,
            color: MUTED,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={emailSplit}
            onChange={(e) => { setEmailSplit(e.target.checked); setSelected(null); }}
            style={{ accentColor: "var(--color-accent)" }}
          />
          Split email: opt-in / cold
        </label>
      </div>

      {/* PROSE BUDGET. This was five paragraphs before the first number:
          what a cell means, last vs first touch, the email-split caveat, the
          first-touch-empty caveat, the snapshot provenance, and the
          Qualified/Engaged definitions.

          Every one of those facts still ships. One line stays visible because
          it changes how the grid is READ; the rest is a disclosure, and the
          first-vs-last explanation moved to the ⓘ on the attribution toggle
          in the header, which is the control that raises the question. */}
      <p
        style={{
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--text-label)",
          color: MUTED,
          margin: "0 0 4px",
          maxWidth: 860,
          lineHeight: 1.5,
        }}
      >
        Each cell is <strong>{metricLabel}</strong> for that{" "}
        {rowDim === "market" ? "market" : "HSM"} from that channel, by{" "}
        <strong>{modeLabel}</strong> attribution.
      </p>

      <details style={{ margin: "0 0 4px", maxWidth: 860 }}>
        <summary
          style={{
            cursor: "pointer",
            listStyle: "none",
            fontFamily: "var(--font-family-sans)",
            fontSize: "var(--text-micro)",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: SUBTLE,
          }}
        >
          Why this number?
        </summary>
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-family-sans)",
            fontSize: "var(--text-label)",
            color: MUTED,
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: "0 0 8px" }}>{DEFINITIONS_LINE}</p>
          {emailSplit && (
            <p style={{ margin: "0 0 8px" }}>
              The email split is a view resolved from the source webhook (ActiveCampaign =
              opt-in, Instantly = cold), not a separate channel — those webhooks don&apos;t
              exist yet, so the split columns render em-dashes.
            </p>
          )}
          {mode === "first" && (
            <p style={{ margin: "0 0 8px" }}>
              The app&apos;s first-touch fields are empty (verified against its attribution
              export), so first-touch views render em-dashes until the contact store exists.
            </p>
          )}
          {rowDim === "market" && mode === "last" && (
            <p style={{ margin: 0 }}>
              Populated numbers cover <strong>{tfLabel}</strong>, Qualified-side only, from a
              one-time <strong>{snapshotLabel}</strong> — a point-in-time export, not a live
              sync. Channel attribution is the app&apos;s referral source, conservatively
              mapped; everything ambiguous is counted as direct.
            </p>
          )}
        </div>
      </details>

      {/* ── the grid ── */}
      <div style={{ marginTop: "var(--space-4)" }}>
        <Panel
          title={`${metricLabel} by ${rowDim === "market" ? "market" : "HSM"} × channel`}
          right={
            <span
              style={{
                fontFamily: "var(--font-family-sans)",
                fontSize: "var(--text-label)",
                whiteSpace: "nowrap",
                color: stale ? "var(--color-accent)" : SUBTLE,
                fontWeight: stale ? 700 : 400,
              }}
              title={stale ? "The snapshot is more than 7 days old — numbers have drifted." : undefined}
            >
              {provenance}
              {stale && " · STALE"}
            </span>
          }
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>{rowDim === "market" ? "Market" : "HSM"}</th>
                  {columns.map((c) => (
                    <th key={c.key} style={{ ...th, textAlign: "right" }}>
                      {c.label}
                    </th>
                  ))}
                  <th style={{ ...th, textAlign: "right", borderLeft: "1px solid var(--color-border)", paddingLeft: 12 }}>
                    All
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rowTotal = rowTotals.get(r.key) ?? null;
                  const rowTotalMetric = rowTotal ? formatMetric(rowTotal, metric) : { n: null, text: null };
                  return (
                    <tr key={r.key}>
                      <td style={{ ...td, minWidth: 190 }}>
                        <div style={{ fontWeight: 600 }}>{r.label}</div>
                        {r.sub && (
                          <div style={{ fontSize: "var(--text-label)", color: SUBTLE, marginTop: 1 }}>
                            {r.sub}
                          </div>
                        )}
                        {/* Target bars only when the header timeframe IS a
                            single month — the 50 target is per month, and a
                            YTD grid with this-month bars was two timeframes
                            in one view. */}
                        {rowDim === "market" && barMonth && (
                          <div style={{ marginTop: 5 }}>
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
                          <td key={c.key} style={{ ...td, padding: 0, textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => setSelected(isSelected ? null : { row: r.key, col: c.key })}
                              aria-pressed={isSelected}
                              aria-label={`${r.label} × ${c.label} — open breakdown`}
                              style={{
                                width: "100%",
                                minWidth: 64,
                                padding: "14px 8px",
                                border: 0,
                                background: isSelected
                                  ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                                  : heatFor(c.key, n) ?? "transparent",
                                boxShadow: isSelected
                                  ? "inset 0 0 0 1.5px var(--color-accent)"
                                  : "none",
                                borderRadius: "var(--radius-sm, 6px)",
                                fontFamily: "var(--font-family-sans)",
                                fontSize: "var(--text-small)",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: text !== null && !isZero ? 600 : 400,
                                color: text === null || isZero ? SUBTLE : "var(--color-text)",
                                cursor: "pointer",
                                textAlign: "right",
                              }}
                            >
                              {text ?? DASH}
                            </button>
                          </td>
                        );
                      })}
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: rowTotalMetric.text === null ? SUBTLE : "var(--color-text)",
                          borderLeft: "1px solid var(--color-border)",
                          paddingLeft: 12,
                        }}
                      >
                        {rowTotalMetric.text ?? DASH}
                      </td>
                    </tr>
                  );
                })}
                {/* totals row */}
                <tr>
                  <td style={{ ...td, fontWeight: 700, borderBottom: 0, borderTop: "1px solid var(--color-border)" }}>
                    All {rowDim === "market" ? "markets" : "HSMs"}
                  </td>
                  {columns.map((c) => {
                    const t = columnTotals.get(c.key) ?? null;
                    const m = t ? formatMetric(t, metric) : { n: null, text: null };
                    return (
                      <td
                        key={c.key}
                        style={{
                          ...td,
                          textAlign: "right",
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: m.text === null ? SUBTLE : "var(--color-text)",
                          borderBottom: 0,
                          borderTop: "1px solid var(--color-border)",
                        }}
                      >
                        {m.text ?? DASH}
                      </td>
                    );
                  })}
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: grandTotal ? "var(--color-text)" : SUBTLE,
                      borderBottom: 0,
                      borderTop: "1px solid var(--color-border)",
                      borderLeft: "1px solid var(--color-border)",
                      paddingLeft: 12,
                    }}
                  >
                    {grandTotal ? formatMetric(grandTotal, metric).text ?? DASH : DASH}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0" }}>
            Click a cell for its breakdown by source, the other metrics, and the funnel.
            Cell shading is proportional to the column&apos;s largest value.
          </p>
        </Panel>
      </div>

      {/* ── drill-down drawer ── */}
      {selectionValid && (
        <>
          <div
            aria-hidden
            onClick={() => setSelected(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(16, 42, 67, 0.18)",
              zIndex: 60,
            }}
          />
          <aside
            role="dialog"
            aria-label={`${selectedRow!.label} × ${selectedCol!.label} breakdown`}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(430px, 94vw)",
              background: "var(--color-surface-raised)",
              borderLeft: "1px solid var(--color-border)",
              boxShadow: "var(--elevation-raised)",
              zIndex: 61,
              overflowY: "auto",
              padding: "20px 22px 40px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h3
                style={{
                  fontFamily: "var(--font-family-serif)",
                  fontSize: 19,
                  fontWeight: 600,
                  margin: 0,
                  flex: 1,
                }}
              >
                {selectedRow!.label} × {selectedCol!.label}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close breakdown"
                style={{
                  cursor: "pointer",
                  border: 0,
                  background: "transparent",
                  color: MUTED,
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>
            <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "4px 0 0" }}>
              {provenance}
            </p>

            {/* the six metrics */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 28px", marginTop: 18 }}>
              {REPORT_METRICS.map((m) => {
                const v = drawerCell ? formatMetric(drawerCell, m.key) : { n: null, text: null };
                return (
                  <div key={m.key} style={{ minWidth: 74 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-family-serif)",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 22,
                        fontWeight: 600,
                        color: v.text === null ? SUBTLE : "var(--color-text)",
                        lineHeight: 1,
                      }}
                    >
                      {v.text ?? DASH}
                    </div>
                    <div style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, marginTop: 5 }}>
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* by source — the campaign-ish dimension the snapshot has */}
            <div style={{ marginTop: 24 }}>
              <p style={{ ...eyebrow, marginBottom: 8 }}>By referral source</p>
              {drawerBreakdown.length === 0 ? (
                <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: MUTED, margin: 0, lineHeight: 1.6 }}>
                  {drawerCell
                    ? "No Qualified leads in this cell for the selected timeframe."
                    : "This view has no data source yet — see the page notes for what it needs."}
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Source</th>
                      <th style={{ ...th, textAlign: "right" }}>Qualified</th>
                      <th style={{ ...th, textAlign: "right" }}>Closed</th>
                      <th style={{ ...th, textAlign: "right" }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawerBreakdown.map((s) => (
                      <tr key={s.source}>
                        <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12 }}>{s.source}</td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                          {s.qualified}
                        </td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", color: s.closed ? "var(--color-text)" : SUBTLE }}>
                          {s.closed}
                        </td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", color: s.revenue ? "var(--color-text)" : SUBTLE }}>
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
              <div style={{ marginTop: 24 }}>
                <p style={{ ...eyebrow, marginBottom: 8 }}>Funnel</p>
                {FUNNEL_STAGES.map((stage, i) => {
                  const n = drawerCell.funnel[i];
                  const max = drawerCell.funnel[0] || 1;
                  return (
                    <div key={stage} style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 0" }}>
                      <span style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, width: 118, flex: "none" }}>
                        {stage}
                      </span>
                      <span
                        aria-hidden
                        style={{
                          height: 8,
                          width: `${(n / max) * 140}px`,
                          minWidth: n > 0 ? 3 : 0,
                          background: "color-mix(in srgb, var(--color-brand) 55%, transparent)",
                          borderRadius: 4,
                          flex: "none",
                        }}
                      />
                      <span style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                        {n}
                      </span>
                    </div>
                  );
                })}
                <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "8px 0 0", lineHeight: 1.5 }}>
                  Cumulative reached-at-least counts. Closed = status Won only.
                </p>
              </div>
            )}

            {/* the honest limit */}
            <p
              style={{
                fontFamily: "var(--font-family-sans)",
                fontSize: "var(--text-label)",
                color: MUTED,
                margin: "24px 0 0",
                lineHeight: 1.6,
                borderTop: "1px solid var(--color-border)",
                paddingTop: 12,
              }}
            >
              The contributing leads themselves — names, dates, campaigns, entry points,
              first vs last touch, links into the app — need the live app sync. The
              snapshot is PII-stripped and carries no lead ids, so this drawer shows
              everything it honestly can.
            </p>
          </aside>
        </>
      )}
    </>
  );
}
