// Shared presentational pieces for the Hub screens — thin wrappers over the
// app design system in app/(site)/admin/_ui (DESIGN-APP.md). Pure styling,
// no data access. Server and client components both import from here.

import { PageHeader } from "@/app/(site)/admin/_ui/AppShell";
import { Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { InfoPopover } from "@/app/(site)/admin/_ui/InfoPopover";
import { Badge, DASH, Meta } from "@/app/(site)/admin/_ui/primitives";
import { WIRING_TONE } from "@/app/(site)/admin/_ui/tone";
import { DEFINITIONS_LINE, type HubSurface, type WiringStatus } from "@/config/marketingHub";

export { DASH };

// CSS colour strings for the legacy /marketing chrome's SVG charts and dots.
// New surfaces use the tone classes (tone.ts); these exist so the legacy
// screens keep compiling against one vocabulary.
export const PACE_TONE = {
  on: "var(--tone-good)",
  behind: "var(--tone-warn)",
  risk: "var(--tone-bad)",
} as const;

export const STATUS_TONE: Record<WiringStatus, string> = {
  live: "var(--tone-good)",
  partial: "var(--tone-warn)",
  waiting: "var(--tone-unknown)",
};

export const STATUS_LABEL: Record<WiringStatus, string> = {
  live: "live",
  partial: "partially wired",
  waiting: "not wired yet",
};

export function StatusChip({ status }: { status: WiringStatus }) {
  return <Badge tone={WIRING_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

/** Page header: sans title, wiring pill, target. The purpose line lives
 *  behind the ⓘ — context, not a number. */
export function HubPageHeader({ surface, right }: { surface: HubSurface; right?: React.ReactNode }) {
  return (
    <PageHeader
      title={surface.label}
      right={
        <>
          <StatusChip status={surface.status} />
          {surface.target && <Meta>Target: {surface.target}</Meta>}
          <InfoPopover label={`About ${surface.label}`} align="right">
            <p className="m-0">{surface.purpose}</p>
          </InfoPopover>
          {right}
        </>
      }
    />
  );
}

/**
 * The build order for the page — what must exist before the surface can show
 * real numbers. One line, opens on request.
 */
export function NeedsBlock({ surface }: { surface: HubSurface }) {
  if (surface.status === "live") return null;
  return (
    <details className="mt-4">
      <summary className="cursor-pointer list-none font-sans text-ops-label font-semibold text-content-subtle hover:text-content [&::-webkit-details-marker]:hidden">
        {surface.needs.length} {surface.needs.length === 1 ? "thing" : "things"} needed ›
      </summary>
      <ol className="m-0 mt-2 list-decimal pl-5 font-sans text-ops-label leading-[1.7] text-content-muted">
        {surface.needs.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ol>
    </details>
  );
}

/** The Qualified / Engaged definitions, behind an ⓘ beside the number that
 *  raises the question. Never rendered as a paragraph. */
export function DefinitionsInfo({ align = "left" }: { align?: "left" | "right" }) {
  return (
    <InfoPopover label="How Qualified and Engaged are defined" align={align}>
      <p className="m-0">{DEFINITIONS_LINE}</p>
    </InfoPopover>
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
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="relative inline-block h-1.5 w-[72px] flex-none overflow-hidden rounded-pill border border-app-border-strong"
      >
        {fraction !== undefined && (
          <span className="absolute inset-0 rounded-pill bg-brand" style={{ width: `${pct}%` }} />
        )}
      </span>
      {label && (
        <span className="whitespace-nowrap font-sans text-ops-label tabular-nums text-content-subtle">{label}</span>
      )}
    </span>
  );
}

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
    <Table>
      <thead>
        <tr>
          <Th>{firstColumnLabel}</Th>
          {columns.map((c) => (
            <Th key={c} align="right">
              {c}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Tr key={r.key}>
            <Td className="font-semibold">{r.label}</Td>
            {columns.map((c) => (
              <Td key={c} align="right" muted>
                {DASH}
              </Td>
            ))}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

/** An empty log: real columns, one honest line about where rows come from. */
export function EmptyLog({ columns, fedBy }: { columns: string[]; fedBy: string }) {
  return (
    <Table>
      <thead>
        <tr>
          {columns.map((c) => (
            <Th key={c}>{c}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <Td muted className="border-b-0" colSpan={columns.length}>
            No rows yet — this table fills from {fedBy}.
          </Td>
        </tr>
      </tbody>
    </Table>
  );
}
