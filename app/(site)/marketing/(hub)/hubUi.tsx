// Shared presentational pieces for the Marketing Hub — the Control Room's
// design language (ui.tsx), specialised for the Hub's unwired state. Pure
// styling, no data access. Server and client components both import from here.

import { Chip, FAIL, Meta, MUTED, OK, SUBTLE, WARN, eyebrow, panelHeading } from "@/app/(site)/admin/(dashboard)/ui";
import { DEFINITIONS_LINE, type HubSurface, type WiringStatus } from "@/config/marketingHub";
import type { PaceState } from "./pacing";

/** The em-dash every unwired metric renders. Never a zero, never a spinner. */
export const DASH = "—";

export const STATUS_TONE: Record<WiringStatus, string> = {
  live: OK,
  partial: WARN,
  waiting: SUBTLE,
};

/** Pace tones — the ONLY meaning green/amber/red carry anywhere in the Hub:
 *  on pace, behind, under half pace. */
export const PACE_TONE: Record<PaceState, string> = {
  on: OK,
  behind: WARN,
  risk: FAIL,
};

export const STATUS_LABEL: Record<WiringStatus, string> = {
  live: "live",
  partial: "partially wired",
  waiting: "not wired yet",
};

export function StatusChip({ status }: { status: WiringStatus }) {
  return <Chip text={STATUS_LABEL[status]} color={STATUS_TONE[status]} dashed={status === "waiting"} />;
}

/** Page header: serif title, wiring status, purpose line, target where one
 *  exists. An h1 — each Hub page is its own screen now, not a tab section. */
export function HubPageHeader({ surface }: { surface: HubSurface }) {
  return (
    <header style={{ marginBottom: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ ...panelHeading, fontSize: 24 }}>{surface.label}</h1>
        <StatusChip status={surface.status} />
        {surface.target && <Meta>Target: {surface.target}</Meta>}
      </div>
      {/* The purpose line was a paragraph under every title. It is context,
          not a number, so it moves to a hover/─title─ and out of the default
          view. Screens that genuinely need it visible say so themselves. */}
      <p
        title={surface.purpose}
        style={{
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--text-label)",
          color: SUBTLE,
          margin: "4px 0 0",
          maxWidth: 720,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {surface.purpose}
      </p>
    </header>
  );
}

/**
 * The build order for the page. Emptiness as direction, not apology: this is
 * what must exist before the surface can show real numbers.
 */
export function NeedsBlock({ surface }: { surface: HubSurface }) {
  if (surface.status === "live") return null;
  // PROSE BUDGET: was an always-open list of up to four sentences under every
  // unwired screen. The list is the build backlog and must survive, but it is
  // not what someone opening the screen came to read — so it collapses to one
  // line and opens on request.
  return (
    <details style={{ marginTop: "var(--space-4)" }}>
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
        {surface.needs.length} {surface.needs.length === 1 ? "thing" : "things"} needed
      </summary>
      <ol
        style={{
          margin: "8px 0 0",
          paddingLeft: 18,
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--text-label)",
          color: MUTED,
          lineHeight: 1.7,
        }}
      >
        {surface.needs.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ol>
    </details>
  );
}

/** The Qualified / Engaged definitions — rendered as prose on every page that
 *  shows either number. One string, defined once in config/marketingHub.ts. */
export function DefinitionsNote() {
  return (
    <p
      style={{
        fontFamily: "var(--font-family-sans)",
        fontSize: "var(--text-label)",
        color: SUBTLE,
        margin: "12px 0 0",
        maxWidth: 720,
        lineHeight: 1.6,
      }}
    >
      {DEFINITIONS_LINE}
    </p>
  );
}

/** One line of consequence micro copy — what a blank on this surface costs. */
export function ConsequenceNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-family-sans)",
        fontSize: "var(--text-label)",
        color: SUBTLE,
        margin: "10px 0 0",
        maxWidth: 720,
        lineHeight: 1.6,
      }}
    >
      {children}
    </p>
  );
}

/**
 * Progress toward a target. OUTLINE-ONLY while no data exists — the track is
 * the promise; wiring earns the ink. Pass `fraction` (0..1) once a real
 * number exists and the bar fills accordingly.
 */
export function OutlineBar({ label, fraction }: { label?: string; fraction?: number }) {
  const pct = fraction === undefined ? 0 : Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 72,
          height: 6,
          border: "1px solid var(--color-border-strong, var(--color-border))",
          borderRadius: 3,
          flex: "none",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {fraction !== undefined && (
          <span
            style={{
              position: "absolute",
              inset: 0,
              width: `${pct}%`,
              background: "var(--color-accent)",
              borderRadius: 2,
            }}
          />
        )}
      </span>
      {label && (
        <span
          style={{
            fontFamily: "var(--font-family-sans)",
            fontSize: "var(--text-label)",
            color: SUBTLE,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// ── Table primitives (match the Leads tab's table voice) ─────────────────────

export const th: React.CSSProperties = {
  ...eyebrow,
  textAlign: "left",
  padding: "0 16px 8px 0",
  borderBottom: "1px solid var(--color-border)",
  whiteSpace: "nowrap",
};

export const td: React.CSSProperties = {
  padding: "8px 16px 8px 0",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  verticalAlign: "baseline",
};

export const tdDash: React.CSSProperties = { ...td, color: SUBTLE };

/**
 * A table whose structure is real and whose values are not yet: named rows
 * (from config, never invented) × the real columns, every value an em-dash.
 */
export function DashTable({
  columns,
  rows,
  firstColumnLabel,
}: {
  columns: string[];
  rows: { key: string; label: React.ReactNode }[];
  firstColumnLabel: string;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>{firstColumnLabel}</th>
            {columns.map((c) => (
              <th key={c} style={{ ...th, textAlign: "right" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td style={{ ...td, fontWeight: 600 }}>{r.label}</td>
              {columns.map((c) => (
                <td key={c} style={{ ...tdDash, textAlign: "right" }}>
                  {DASH}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** An empty log: real columns, one honest line about where rows come from. */
export function EmptyLog({ columns, fedBy }: { columns: string[]; fedBy: string }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} style={th}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...tdDash, borderBottom: 0 }} colSpan={columns.length}>
              No rows yet — this table fills from {fedBy}.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
