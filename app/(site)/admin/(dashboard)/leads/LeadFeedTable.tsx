"use client";

import { useState } from "react";
import { Chip, FAIL, MUTED, OK, SUBTLE, WARN, eyebrow } from "../ui";

// ─────────────────────────────────────────────────────────────────────────────
// The lead feed table, with expandable rows. The summary row shows the
// operational read (received / name / market / source / campaign / delivery);
// clicking a row opens EVERYTHING the store holds for that lead — full
// attribution, detection, and the complete delivery record. Nothing about a
// lead is invisible; it's just one click deep.
//
// All values arrive PRE-FORMATTED as strings from the server component —
// identities are masked server-side, so raw PII never reaches this bundle.
// ─────────────────────────────────────────────────────────────────────────────

export type FeedDetailSection = {
  title: string;
  fields: { label: string; value: string; highlight?: "warn" | "fail" }[];
};

export type FeedRow = {
  id: string;
  received: string;
  name: string;
  market: string;
  source: string;
  campaign: string;
  deliveryLabel: string;
  deliveryTone: "ok" | "warn" | "fail" | "unknown";
  unverified: boolean;
  detail: FeedDetailSection[];
};

const TONE: Record<FeedRow["deliveryTone"], string> = {
  ok: OK,
  warn: WARN,
  fail: FAIL,
  unknown: SUBTLE,
};

const th: React.CSSProperties = {
  ...eyebrow,
  textAlign: "left",
  padding: "0 16px 10px 0",
  borderBottom: "1px solid var(--color-border-strong)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "11px 16px 11px 0",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  verticalAlign: "baseline",
};

function DetailField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "warn" | "fail";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{ ...eyebrow, fontSize: 10 }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          lineHeight: 1.45,
          overflowWrap: "anywhere",
          color:
            highlight === "fail" ? FAIL : highlight === "warn" ? WARN : value === "—" ? SUBTLE : "var(--color-text)",
          fontWeight: highlight ? 600 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function LeadFeedTable({ rows }: { rows: FeedRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 28, paddingRight: 8 }} aria-label="Expand" />
            <th style={th}>Received</th>
            <th style={th}>Name</th>
            <th style={th}>Market</th>
            <th style={th}>Source</th>
            <th style={th}>Campaign</th>
            <th style={{ ...th, paddingRight: 0 }}>Delivery</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = open === r.id;
            return (
              <LeadRow
                key={r.id}
                row={r}
                isOpen={isOpen}
                onToggle={() => setOpen(isOpen ? null : r.id)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LeadRow({
  row: r,
  isOpen,
  onToggle,
}: {
  row: FeedRow;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const rowBg = isOpen
    ? "var(--color-surface)"
    : hover
      ? "color-mix(in srgb, var(--color-surface) 55%, transparent)"
      : "transparent";
  // The whole row toggles; the chevron carries the button semantics so
  // keyboard and screen-reader users get a real control.
  const cellBorder = isOpen ? "none" : undefined;
  return (
    <>
      <tr
        onClick={onToggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ cursor: "pointer", background: rowBg }}
      >
        <td style={{ ...td, borderBottom: cellBorder, paddingRight: 8, width: 28 }}>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Collapse" : "Expand"} lead from ${r.name}, ${r.received}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            style={{
              cursor: "pointer",
              border: "none",
              background: "transparent",
              padding: 2,
              color: SUBTLE,
              fontSize: 11,
              lineHeight: 1,
              display: "inline-block",
              transform: isOpen ? "rotate(90deg)" : "none",
              transition: "transform var(--duration-fast) var(--easing-out)",
            }}
          >
            ▶
          </button>
        </td>
        <td style={{ ...td, borderBottom: cellBorder, color: MUTED, whiteSpace: "nowrap" }}>
          {r.received}
        </td>
        <td style={{ ...td, borderBottom: cellBorder, fontWeight: 600 }}>{r.name}</td>
        <td style={{ ...td, borderBottom: cellBorder }}>{r.market}</td>
        <td style={{ ...td, borderBottom: cellBorder }}>{r.source}</td>
        <td style={{ ...td, borderBottom: cellBorder, color: MUTED }}>{r.campaign}</td>
        <td style={{ ...td, borderBottom: cellBorder, paddingRight: 0, whiteSpace: "nowrap" }}>
          <span style={{ display: "inline-flex", gap: 6 }}>
            <Chip text={r.deliveryLabel} color={TONE[r.deliveryTone]} />
            {r.unverified && <Chip text="unverified" color={WARN} />}
          </span>
        </td>
      </tr>
      {isOpen && (
        <tr style={{ background: "var(--color-surface)" }}>
          <td colSpan={7} style={{ ...td, padding: "4px 0 18px 36px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "var(--space-6)",
                alignItems: "start",
              }}
            >
              {r.detail.map((section) => (
                <div key={section.title}>
                  <div
                    style={{
                      fontFamily: "var(--font-family-serif)",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      paddingBottom: 6,
                      marginBottom: 10,
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    {section.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {section.fields.map((f) => (
                      <DetailField key={f.label} {...f} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
