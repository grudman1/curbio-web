"use client";

import type React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// The ops table. Same anatomy as the Channels table on Home — hairline rules,
// 12px muted headers, 14px body, tabular numerals — exposed as parts so any
// screen can build its own columns without redeclaring the styling.
//
// ── Alignment is a modifier, never a default ────────────────────────────────
// `.ops-th` deliberately sets no text-align. It used to, and a hardcoded `left`
// silently beat the `text-right` utility on numeric columns, so headers sat
// left while their values sat right. `align` drives BOTH the header class and
// the cell class, so a column and its header cannot drift apart.
//
// ── Sorting ────────────────────────────────────────────────────────────────
// A sortable header is a real <button> with aria-sort, so it works from the
// keyboard and announces its state. The arrow is the entire affordance: no
// "sortable · click a row" caption exists in this system.
// ─────────────────────────────────────────────────────────────────────────────

export type SortDir = "asc" | "desc";
type Align = "left" | "right";

export function Table({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Horizontal overflow scrolls the table, never the page.
  return (
    <div className="w-full overflow-x-auto">
      <table className={`ops-table ${className}`}>{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="ops-thead-row">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  sort,
  className = "",
}: {
  children: React.ReactNode;
  align?: Align;
  /** Omit for a static header. */
  sort?: {
    /** Current direction for THIS column, or null when another column owns it. */
    dir: SortDir | null;
    onSort: () => void;
  };
  className?: string;
}) {
  const cls = `ops-th ops-th--${align} ${className}`;
  if (!sort) return <th className={cls}>{children}</th>;
  const ariaSort = sort.dir === "asc" ? "ascending" : sort.dir === "desc" ? "descending" : "none";
  return (
    <th className={cls} aria-sort={ariaSort}>
      <button type="button" className="ops-th--sort" onClick={sort.onSort}>
        {children}
        <span className="ops-th-arrow" aria-hidden>
          {sort.dir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}

export function Tr({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  /** Makes the row interactive — adds the hover treatment and a button role. */
  onClick?: () => void;
}) {
  return (
    <tr
      className={`ops-tbody-row${onClick ? " ops-tbody-row--link" : ""} ${className}`}
      onClick={onClick}
      {...(onClick ? { role: "button", tabIndex: 0 } : {})}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  align = "left",
  numeric = false,
  muted = false,
  colSpan,
  className = "",
}: {
  children: React.ReactNode;
  align?: Align;
  /** Tabular numerals — every figure in this system is column-aligned. */
  numeric?: boolean;
  muted?: boolean;
  colSpan?: number;
  className?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`ops-td text-${align}${numeric ? " ops-tnum" : ""}${muted ? " ops-muted" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

/** The channel dot used in any table that names a channel. */
export function Swatch({ color }: { color: string }) {
  return <span className="ops-swatch" style={{ background: color }} aria-hidden />;
}
