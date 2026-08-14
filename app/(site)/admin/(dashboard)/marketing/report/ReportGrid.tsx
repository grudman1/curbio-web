"use client";

import { useState } from "react";
import { Meta, MUTED, Panel, SUBTLE, eyebrow } from "../../ui";
import {
  ATTRIBUTION_MODES,
  CHANNEL_FUNNEL_ORDER,
  CHANNEL_LABELS,
  EMAIL_SPLIT_VIEWS,
  FUNNEL_STAGES,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
  REPORT_METRICS,
  ROW_DIMENSIONS,
  type AttributionMode,
  type ReportMetricKey,
  type RowDimension,
} from "@/config/marketingHub";
import { DASH, DefinitionsNote, OutlineBar, td, tdDash, th } from "../hubUi";

// The grid: rows × channel columns, ONE metric at a time — nine columns × six
// numbers is a spreadsheet, not a view. The rest of the metrics live in the
// drill-down below the grid. Every toggle works and re-labels the grid; only
// the values are absent (each renders an em-dash until the wiring lands).

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

export function ReportGrid({ markets, hsms }: { markets: Row[]; hsms: Row[] }) {
  const [rowDim, setRowDim] = useState<RowDimension>("market");
  const [metric, setMetric] = useState<ReportMetricKey>("qualified");
  const [mode, setMode] = useState<AttributionMode>("last");
  const [emailSplit, setEmailSplit] = useState(false);
  const [selected, setSelected] = useState<{ row: string; col: string } | null>(null);

  const rows = rowDim === "market" ? markets : hsms;
  const columns = columnsFor(emailSplit);
  const metricLabel = REPORT_METRICS.find((m) => m.key === metric)!.label;
  const modeLabel = ATTRIBUTION_MODES.find((m) => m.key === mode)!.label.toLowerCase();

  const selectedRow = selected ? rows.find((r) => r.key === selected.row) : null;
  const selectedCol = selected ? columns.find((c) => c.key === selected.col) : null;
  const selectionValid = !!(selectedRow && selectedCol);

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
        <Seg label="Attribution" options={ATTRIBUTION_MODES} value={mode} onChange={setMode} />
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
          " The email split is a view resolved from the source webhook (ActiveCampaign = opt-in, Instantly = cold), not a separate channel."}
      </p>
      <DefinitionsNote />

      {/* ── the grid ── */}
      <div style={{ marginTop: "var(--space-4)" }}>
        <Panel
          title={`${metricLabel} by ${rowDim === "market" ? "market" : "HSM"} × channel`}
          right={<Meta>{modeLabel} · channels in funnel order · direct last</Meta>}
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
                      <div style={{ marginTop: 5 }}>
                        <OutlineBar
                          label={`${DASH} of ${QUALIFIED_TARGET_PER_MARKET_PER_MONTH} Qualified this month`}
                        />
                      </div>
                    </td>
                    {columns.map((c) => {
                      const isSelected = selected?.row === r.key && selected?.col === c.key;
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
                              color: SUBTLE,
                              cursor: "pointer",
                              textAlign: "right",
                            }}
                          >
                            {DASH}
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
              {REPORT_METRICS.filter((m) => m.key !== metric).map((m) => (
                <div key={m.key} style={{ minWidth: 86 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-family-serif)",
                      fontSize: 26,
                      fontWeight: 600,
                      color: SUBTLE,
                      lineHeight: 1,
                    }}
                  >
                    {DASH}
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
              ))}
            </div>
            <div style={{ marginTop: "var(--space-5)" }}>
              <p style={{ ...eyebrow, marginBottom: 10 }}>Funnel</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {FUNNEL_STAGES.map((stage, i) => (
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
                          color: SUBTLE,
                          lineHeight: 1,
                        }}
                      >
                        {DASH}
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
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
