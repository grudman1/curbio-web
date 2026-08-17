"use client";

import { useState } from "react";
import { Meta, MUTED, Panel, SUBTLE, eyebrow } from "@/app/(site)/admin/(dashboard)/ui";
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
} from "@/config/marketingHub";
import type { Channel } from "@/lib/channels";
import type { SnapshotAggregates } from "@/config/appLeadsSnapshot";
import type { AttributionMode } from "../timeframe";
import { DASH, DefinitionsNote, OutlineBar, td, th } from "../hubUi";

// The grid: rows × channel columns, ONE metric at a time — nine columns × six
// numbers is a spreadsheet, not a view. The rest of the metrics live in the
// drill-down below the grid. Rows and metric are page-local controls; the
// TIMEFRAME and ATTRIBUTION MODE arrive from the layout header, which governs
// every Hub screen at once.

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

export function ReportGrid({
  markets,
  hsms,
  agg,
  snapshotLabel,
  mode,
  tfLabel,
  barMonth,
  initialMetric,
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
  function cellFor(rowKey: string, colKey: string) {
    if (rowDim !== "market" || mode !== "last") return null;
    if (colKey.startsWith("email_")) return null; // split views need webhooks
    return agg.cells[`${rowKey}|${colKey as Channel}`] ?? { qualified: 0, closed: 0, revenue: 0, funnel: [0, 0, 0, 0, 0, 0] };
  }

  function metricValue(rowKey: string, colKey: string, m: ReportMetricKey): string | null {
    const cell = cellFor(rowKey, colKey);
    if (!cell) return null;
    switch (m) {
      case "qualified": return String(cell.qualified);
      case "closed": return String(cell.closed);
      case "revenue": return cell.revenue ? `$${Math.round(cell.revenue).toLocaleString("en-US")}` : "$0";
      case "close_rate": return cell.qualified ? `${Math.round((cell.closed / cell.qualified) * 100)}%` : null;
      default: return null; // engaged, cac — no source yet
    }
  }

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

      {/* ── what the current view means — the thing people misread ── */}
      <p
        style={{
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--text-label)",
          color: MUTED,
          margin: "0 0 4px",
          maxWidth: 860,
          lineHeight: 1.6,
        }}
      >
        Each cell is <strong>{metricLabel}</strong> for that{" "}
        {rowDim === "market" ? "market" : "HSM"} from that channel, by{" "}
        <strong>{modeLabel}</strong> attribution. Last touch credits the channel of the
        final visit before the event — the channel that closed. First touch credits the
        channel that introduced the contact — the channel that opened. The two disagree
        whenever one channel opens a relationship and another closes it.
        {emailSplit &&
          " The email split is a view resolved from the source webhook (ActiveCampaign = opt-in, Instantly = cold), not a separate channel — those webhooks don't exist yet, so the split columns render em-dashes."}
        {mode === "first" &&
          " The app's first-touch fields are empty (verified against its attribution export), so first-touch views render em-dashes until the contact store exists."}
        {rowDim === "market" && mode === "last" && (
          <>
            {" "}Populated numbers cover <strong>{tfLabel}</strong>, Qualified-side only,
            from a one-time <strong>{snapshotLabel}</strong> — a point-in-time export, not
            a live sync. Channel attribution is the app&apos;s referral source,
            conservatively mapped; everything ambiguous is counted as direct.
          </>
        )}
      </p>
      <DefinitionsNote />

      {/* ── the grid ── */}
      <div style={{ marginTop: "var(--space-4)" }}>
        <Panel
          title={`${metricLabel} by ${rowDim === "market" ? "market" : "HSM"} × channel`}
          right={
            <Meta>
              {rowDim === "market" && mode === "last"
                ? `${tfLabel} · ${snapshotLabel} · direct last`
                : `${tfLabel} · ${modeLabel} · direct last`}
            </Meta>
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
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
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
                          YTD grid with this-month bars was two timeframes in
                          one view. */}
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
                      const value = metricValue(r.key, c.key, metric);
                      const isZero = value === "0" || value === "$0";
                      return (
                        <td key={c.key} style={{ ...td, padding: 0, textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setSelected(isSelected ? null : { row: r.key, col: c.key })}
                            aria-pressed={isSelected}
                            aria-label={`${r.label} × ${c.label}`}
                            style={{
                              width: "100%",
                              minWidth: 64,
                              padding: "14px 8px",
                              border: 0,
                              background: isSelected
                                ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                                : "transparent",
                              boxShadow: isSelected
                                ? "inset 0 0 0 1.5px var(--color-accent)"
                                : "none",
                              borderRadius: "var(--radius-sm, 6px)",
                              fontFamily: "var(--font-family-sans)",
                              fontSize: "var(--text-small)",
                              fontWeight: value !== null && !isZero ? 600 : 400,
                              color: value === null || isZero ? SUBTLE : "var(--color-text)",
                              cursor: "pointer",
                              textAlign: "right",
                            }}
                          >
                            {value ?? DASH}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0" }}>
            Click a cell to open the drill-down — the other five metrics and the funnel.
          </p>
        </Panel>
      </div>

      {/* ── drill-down ── */}
      {selectionValid && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <Panel
            title={`${selectedRow!.label} × ${selectedCol!.label}`}
            right={<Meta>{modeLabel} attribution</Meta>}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px 40px" }}>
              {REPORT_METRICS.filter((m) => m.key !== metric).map((m) => {
                const v = metricValue(selectedRow!.key, selectedCol!.key, m.key);
                return (
                  <div key={m.key} style={{ minWidth: 86 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-family-serif)",
                        fontSize: 26,
                        fontWeight: 600,
                        color: v === null ? SUBTLE : "var(--color-text)",
                        lineHeight: 1,
                      }}
                    >
                      {v ?? DASH}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-family-sans)",
                        fontSize: "var(--text-label)",
                        color: MUTED,
                        marginTop: 6,
                      }}
                    >
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: "var(--space-5)" }}>
              <p style={{ ...eyebrow, marginBottom: 10 }}>Funnel</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {FUNNEL_STAGES.map((stage, i) => {
                  const cell = cellFor(selectedRow!.key, selectedCol!.key);
                  const n = cell ? cell.funnel[i] : null;
                  return (
                  <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-lg)",
                        padding: "10px 14px",
                        minWidth: 108,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-family-serif)",
                          fontSize: 20,
                          fontWeight: 600,
                          color: n === null ? SUBTLE : "var(--color-text)",
                          lineHeight: 1,
                        }}
                      >
                        {n ?? DASH}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-family-sans)",
                          fontSize: "var(--text-label)",
                          color: MUTED,
                          marginTop: 5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {stage}
                      </div>
                    </div>
                    {i < FUNNEL_STAGES.length - 1 && (
                      <span aria-hidden style={{ color: SUBTLE, fontSize: 13 }}>
                        →
                      </span>
                    )}
                  </div>
                  );
                })}
              </div>
              {cellFor(selectedRow!.key, selectedCol!.key) && (
                <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "10px 0 0" }}>
                  Cumulative reached-at-least counts from the snapshot. Closed = status
                  Won only — the app&apos;s post-proposal production stages never count as
                  Closed on their own.
                </p>
              )}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
