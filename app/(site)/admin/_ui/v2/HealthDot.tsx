import type React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// A metric with no source behind it, and the list of them.
//
// The dot plus a hover tooltip, never a "needs a spend store to unlock" label.
// Coaching text on a dashboard ages badly, repeats itself once per card, and
// tells a reader who already knows. The dot says "not wired"; the tooltip says
// what would wire it; the value beside it is an em-dash. That is the whole
// vocabulary.
//
// This is the same treatment Home's unwired KPI (Blended CAC) already uses —
// lifted out of OpsCard so a section, a table cell or a list item can carry it
// too, rather than only a stat card.
// ─────────────────────────────────────────────────────────────────────────────

export function HealthDot({ tooltip }: { tooltip: string }) {
  return (
    <span className="ops-dot ops-dot--unwired" title={tooltip} aria-label={tooltip} role="img" />
  );
}

export type HealthItem = {
  /** What the thing is — two or three words, not a sentence. */
  label: string;
  /** What would make it real. Carried on hover, never printed. */
  tooltip: string;
};

/**
 * What a surface is still missing, as a row of dots.
 *
 * Replaces the numbered "N things needed" prose blocks: those were a list of
 * sentences pretending to be a status panel. A reader scanning for whether a
 * number is trustworthy wants to see how many dots there are, not read four
 * lines explaining each one.
 */
export function HealthList({ items }: { items: readonly HealthItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="ops-health">
      {items.map((it) => (
        <li key={it.label} className="ops-health-item">
          <HealthDot tooltip={it.tooltip} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/** live / stub / planned and friends, on the ops badge tones. */
export function StatusBadge({
  status,
  tone,
}: {
  status: string;
  tone: "success" | "warning" | "error" | "neutral";
}) {
  return <span className={`ops-badge ops-badge--${tone}`}>{status}</span>;
}
