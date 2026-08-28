// The table vocabulary — every table in the app is these pieces, so density,
// alignment and hover behaviour cannot drift screen to screen. Server-safe.
//
// Row actions: put an <ActionsTd> last in the row. Its buttons are invisible
// until the row is hovered or anything in it is focused — no underlined
// "edit"/"log" text links in data columns, and keyboard users lose nothing
// (focus reveals them).

import { Icon, type IconName } from "./Icon";

/**
 * The strip between a flush Panel's title row and its table: filters on the
 * left, the primary action on the right. Client components own their own
 * toolbars because the action usually opens a drawer they hold state for.
 */
export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 px-ops-panel pb-3">{children}</div>
  );
}

/** Scroll container + table. Wide tables scroll inside their card, never the
 *  page. Use inside `<Panel flush>` for the standard card-with-table. */
export function Table({
  children,
  className = "",
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Many columns: size to content and scroll, rather than squeezing every
   *  column until words wrap mid-label. */
  wide?: boolean;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table
        className={`border-collapse font-sans text-ops-table ${wide ? "w-max min-w-full" : "w-full"}`}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className = "",
  "aria-label": ariaLabel,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <th
      aria-label={ariaLabel}
      className={`whitespace-nowrap border-b border-app-border bg-app-well px-3 py-2 font-sans text-ops-micro font-bold uppercase text-content-subtle first:pl-ops-panel last:pr-ops-panel ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

/** Row with the standard hover fill. `group/row` powers ActionsTd reveal. */
export function Tr({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={`group/row transition-colors duration-fast ease-out hover:bg-app-well ${className}`}>
      {children}
    </tr>
  );
}

export function Td({
  children,
  align = "left",
  muted = false,
  className = "",
  colSpan,
  title,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  muted?: boolean;
  className?: string;
  colSpan?: number;
  title?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      title={title}
      className={`border-b border-app-border px-3 py-2 align-middle first:pl-ops-panel last:pr-ops-panel ${
        align === "right" ? "text-right tabular-nums" : "text-left"
      } ${muted ? "text-content-subtle" : "text-content"} ${className}`}
    >
      {children}
    </td>
  );
}

/** Last cell of an editable row: icon actions, revealed on hover/focus. */
export function ActionsTd({ children }: { children: React.ReactNode }) {
  return (
    <td className="w-px whitespace-nowrap border-b border-app-border px-3 py-1 text-right last:pr-3">
      <span className="inline-flex items-center gap-0.5 opacity-0 transition-opacity duration-fast ease-out focus-within:opacity-100 group-hover/row:opacity-100">
        {children}
      </span>
    </td>
  );
}

/** Small ghost icon button for row actions. Always labelled. */
export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-content-subtle transition-colors duration-fast ease-out hover:bg-app-well hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-40"
    >
      <Icon name={icon} size={14} />
    </button>
  );
}
