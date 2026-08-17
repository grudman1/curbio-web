"use client";

import { useState } from "react";
import { Meta, MUTED, Panel, Stat, SUBTLE, eyebrow, panelHeading } from "@/app/(site)/admin/(dashboard)/ui";
import {
  COST_PER_ATTENDEE_TARGET_USD,
  COST_PER_MEETING_TARGET_USD,
  DEFINITIONS_LINE,
  FORM_TYPES,
  HUB_SURFACES,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
} from "@/config/marketingHub";
import { DASH, OutlineBar, STATUS_LABEL, StatusChip, td, tdDash, th } from "../hubUi";

// Built for the exec audience: no toggles required to understand it, every
// number labeled with its definition, and the prose definitions included in
// the printed output. The "Present" button plus the print stylesheet below is
// the presentation affordance — the page prints without the Control Room
// chrome or the on-screen controls.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-03" → "March 2026". Selector months come from the snapshot itself,
 *  so the page never offers a month it has no data for. */
function monthLabelFor(ym: string): string {
  return `${MONTH_NAMES[Number(ym.slice(5)) - 1] ?? ym} ${ym.slice(0, 4)}`;
}

const noteLabel: React.CSSProperties = {
  ...eyebrow,
  display: "block",
  marginBottom: 8,
};

const noteArea: React.CSSProperties = {
  width: "100%",
  minHeight: 96,
  resize: "vertical",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "10px 12px",
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  background: "var(--color-surface-raised)",
  lineHeight: 1.6,
};

export function MonthlyReview({
  markets,
  months: snapshotMonths,
  qualifiedByMarketMonth,
  closedByMarketMonth,
  snapshotLabel,
}: {
  markets: { key: string; label: string }[];
  /** Ascending "YYYY-MM" months present in the snapshot. */
  months: string[];
  qualifiedByMarketMonth: Record<string, number>;
  closedByMarketMonth: Record<string, number>;
  snapshotLabel: string;
}) {
  const months = [...snapshotMonths].reverse().map((key) => ({ key, label: monthLabelFor(key) }));
  const [month, setMonth] = useState(months[0]?.key ?? "");
  const monthLabel = months.find((m) => m.key === month)?.label ?? month;

  return (
    <>
      {/* Print rules: the Control Room header/tabs, hub nav, and the on-screen
          controls disappear; the review itself is the whole document. */}
      <style>{`@media print {
        header, nav, .mh-no-print { display: none !important; }
        textarea { border: 1px solid #ccc !important; }
      }`}</style>

      {/* ── month selector + presentation affordance ── */}
      <div
        className="mh-no-print"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: "var(--space-4)",
        }}
      >
        <span style={eyebrow}>Month</span>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            fontFamily: "var(--font-family-sans)",
            fontSize: "var(--text-small)",
            fontWeight: 600,
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-pill)",
            padding: "6px 12px",
            background: "var(--color-surface-raised)",
            cursor: "pointer",
          }}
        >
          {months.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-family-sans)",
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--color-text)",
            border: "1.5px solid var(--color-text)",
            borderRadius: "var(--radius-pill)",
            padding: "7px 16px",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Present
        </button>
      </div>

      {/* ── printed title (screen sees the page header above) ── */}
      <h2 style={{ ...panelHeading, fontSize: 22, marginBottom: "var(--space-4)" }}>
        Marketing review — {monthLabel}
      </h2>

      {/* ── 1. the headline grid: the single table the meeting is about ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Panel
          title={`Qualified vs. ${QUALIFIED_TARGET_PER_MARKET_PER_MONTH}, by market`}
          right={<Meta>{monthLabel} · {snapshotLabel}</Meta>}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Market</th>
                  <th style={{ ...th, textAlign: "right" }}>Qualified</th>
                  <th style={{ ...th, textAlign: "right" }}>Closed</th>
                  <th style={{ ...th, textAlign: "right" }}>
                    Target ({QUALIFIED_TARGET_PER_MARKET_PER_MONTH})
                  </th>
                  <th style={th}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m) => {
                  const q = qualifiedByMarketMonth[`${m.key}|${month}`] ?? 0;
                  const c = closedByMarketMonth[`${m.key}|${month}`] ?? 0;
                  return (
                    <tr key={m.key}>
                      <td style={{ ...td, fontWeight: 600 }}>{m.label}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: q ? 600 : 400, color: q ? "var(--color-text)" : SUBTLE }}>
                        {q}
                      </td>
                      <td style={{ ...td, textAlign: "right", color: c ? "var(--color-text)" : SUBTLE }}>
                        {c}
                      </td>
                      <td style={{ ...td, textAlign: "right", color: MUTED }}>
                        {QUALIFIED_TARGET_PER_MARKET_PER_MONTH}
                      </td>
                      <td style={td}>
                        <OutlineBar
                          fraction={q / QUALIFIED_TARGET_PER_MARKET_PER_MONTH}
                          label={`${q} of ${QUALIFIED_TARGET_PER_MARKET_PER_MONTH}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0", lineHeight: 1.6 }}>
            Qualified = estimate requests created in {monthLabel}; Closed = of those, the
            ones whose status is Won. Numbers come from a one-time {snapshotLabel} — a
            point-in-time export, not a live sync.
          </p>
          <p
            style={{
              fontFamily: "var(--font-family-sans)",
              fontSize: "var(--text-label)",
              color: SUBTLE,
              margin: "12px 0 0",
              maxWidth: 860,
              lineHeight: 1.6,
            }}
          >
            {DEFINITIONS_LINE}
          </p>
        </Panel>
      </div>

      {/* ── 2. engagement summary — subordinate: smaller, below, never beside ── */}
      <div style={{ maxWidth: 860, marginBottom: "var(--space-4)" }}>
        <Panel title="Engagement — the leading indicator" right={<Meta>{monthLabel}</Meta>}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 28px" }}>
            {FORM_TYPES.map((t) => (
              <div key={t} style={{ minWidth: 72 }}>
                <div
                  style={{
                    fontFamily: "var(--font-family-serif)",
                    fontSize: 22,
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
                  }}
                >
                  {t.replace("_", " ")}
                </div>
              </div>
            ))}
          </div>
          <p
            style={{
              fontFamily: "var(--font-family-sans)",
              fontSize: "var(--text-small)",
              color: MUTED,
              margin: "16px 0 0",
              maxWidth: 720,
              lineHeight: 1.6,
            }}
          >
            Engaged totals by type. These are hand-raises, not estimate requests — this
            month&apos;s toolkits are next quarter&apos;s estimate requests. They never
            count toward the {QUALIFIED_TARGET_PER_MARKET_PER_MONTH}.
          </p>
        </Panel>
      </div>

      {/* ── 3. initiative scorecards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-4)",
        }}
      >
        <Panel title="Partners" right={<Meta>{monthLabel}</Meta>}>
          <div style={{ display: "flex", gap: 32 }}>
            <Stat label="partners worked" value={DASH} tone={SUBTLE} />
            <Stat label="meetings booked" value={DASH} tone={SUBTLE} />
          </div>
        </Panel>
        <Panel title="Outreach" right={<Meta>vs. ${COST_PER_MEETING_TARGET_USD} per meeting</Meta>}>
          <div style={{ display: "flex", gap: 32 }}>
            <Stat label="meetings booked" value={DASH} tone={SUBTLE} />
            <Stat label="cost per meeting" value={DASH} tone={SUBTLE} />
          </div>
        </Panel>
        <Panel title="Events" right={<Meta>vs. ${COST_PER_ATTENDEE_TARGET_USD} per attendee</Meta>}>
          <div style={{ display: "flex", gap: 32 }}>
            <Stat label="events held" value={DASH} tone={SUBTLE} />
            <Stat label="cost per attendee" value={DASH} tone={SUBTLE} />
          </div>
        </Panel>
      </div>

      {/* ── 4. the meeting agenda: three parts, in order ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Panel title="Discussion" right={<Meta>the meeting agenda</Meta>}>
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <label>
              <span style={noteLabel}>Wins</span>
              <textarea style={noteArea} placeholder="What worked this month, and why." />
            </label>
            <label>
              <span style={noteLabel}>Concerns</span>
              <textarea style={noteArea} placeholder="What is off track, and what it costs if it stays off track." />
            </label>
            <label>
              <span style={noteLabel}>Decisions needed</span>
              <textarea style={noteArea} placeholder="What the exec team must decide in this meeting." />
            </label>
          </div>
          <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0" }}>
            Notes are not yet persisted — they live for this page view and print with it.
            Persistence is in the build order below.
          </p>
        </Panel>
      </div>

      {/* ── 5. build status — why is this number blank, answered on the page ── */}
      <Panel title="Build status" right={<Meta>from the wiring registry</Meta>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Surface</th>
                <th style={th}>Status</th>
                <th style={th}>Waiting on</th>
              </tr>
            </thead>
            <tbody>
              {HUB_SURFACES.map((s) => (
                <tr key={s.slug}>
                  <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>{s.label}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <StatusChip status={s.status} />
                  </td>
                  <td style={{ ...td, color: MUTED, lineHeight: 1.6 }}>
                    {s.status === "live" ? "nothing — wired" : s.needs.join("; ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0" }}>
          Every blank on this page traces to a row here ({STATUS_LABEL.waiting} /{" "}
          {STATUS_LABEL.partial} / {STATUS_LABEL.live}). The needs lists are the build
          order.
        </p>
      </Panel>

      {/* The needs block intentionally lives in the build-status table above on
          this page — the exec audience reads one table, not a second aside. */}
    </>
  );
}
