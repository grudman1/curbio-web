import type React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// The page header for every /admin screen below Home.
//
// The title is the ONLY serif below the shell — page-level headings are Lora,
// everything smaller is Libre Franklin (see tokens.css §Page header). A card
// title that reached for this component would be putting a serif where the
// system does not allow one, which is why the size is fixed here rather than
// exposed as a prop.
//
// `subtitle` is one line and there is deliberately nowhere to put a second:
// provenance or window ("Aug 2026 · 8 markets"), never explanation. Anything
// that needs explaining is a tooltip or it is cut.
// ─────────────────────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  badge,
  right,
}: {
  title: string;
  /** ONE line — a window or a provenance stamp, not a sentence. */
  subtitle?: React.ReactNode;
  /** Tier / status pill, rendered beside the title. */
  badge?: React.ReactNode;
  /** Controls: filters, segmented switches, actions. */
  right?: React.ReactNode;
}) {
  return (
    <header className="ops-page-head">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="ops-page-title">{title}</h1>
          {badge}
        </div>
        {subtitle && <div className="ops-page-sub">{subtitle}</div>}
      </div>
      {right && <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>}
    </header>
  );
}
