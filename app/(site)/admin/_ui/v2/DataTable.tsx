// Stripe-style table: 11px uppercase muted header, 14px cells, tabular
// right-aligned numerics, row hover fill, horizontal dividers only — no
// vertical gridlines anywhere. Server-safe; sorting (when a screen needs it)
// is the caller's state, this just renders the caret.

export function Table({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse font-ui2 text-ui2-body">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  sort,
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  /** Present when this column is sortable; "current" shows the active caret. */
  sort?: "asc" | "desc" | "none";
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap border-b border-ui2-border px-3 py-2 font-ui2 text-ui2-eyebrow font-semibold uppercase text-ui2-text-muted first:pl-5 last:pr-5 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sort && sort !== "none" && (
          <span aria-hidden className="text-[9px] leading-none">
            {sort === "asc" ? "▲" : "▼"}
          </span>
        )}
      </span>
    </th>
  );
}

export function Tr({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={`transition-colors duration-150 ease-out hover:bg-ui2-well ${className}`}>{children}</tr>;
}

export function Td({
  children,
  align = "left",
  muted = false,
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-ui2-divider px-3 py-2.5 align-middle first:pl-5 last:pr-5 ${
        align === "right" ? "text-right tabular-nums" : "text-left"
      } ${muted ? "text-ui2-text-muted" : "text-ui2-text"} ${className}`}
    >
      {children}
    </td>
  );
}
