import type { HubSurface, WiringStatus } from "@/config/marketingHub";
import { PageHeader } from "./PageHeader";
import { HealthList, StatusBadge, type HealthItem } from "./HealthDot";

// ─────────────────────────────────────────────────────────────────────────────
// The header and the health line for a configured surface.
//
// `config/marketingHub.ts` already describes every screen — its label, its
// wiring status, its target, and what it still needs. These two components
// render that description in the ops system, so a screen's chrome is data
// rather than markup repeated per page.
//
// The v1 pair this replaces put the surface's `purpose` behind an ⓘ popover and
// its `needs` in a numbered <ol> of sentences. The purpose sentence is gone —
// a page that has to explain what it is for has a title problem — and the needs
// list is now dots with tooltips, which is what a reader scanning for "can I
// trust this number" actually wants.
// ─────────────────────────────────────────────────────────────────────────────

// Exhaustive over WiringStatus — a new status is a compile error here rather
// than a silently grey badge.
const STATUS_TONE: Record<WiringStatus, "success" | "warning" | "error" | "neutral"> = {
  live: "success",
  partial: "warning",
  waiting: "neutral",
};

export function SurfaceHeader({
  surface,
  titleOverride,
  subtitle,
  right,
}: {
  surface: HubSurface;
  titleOverride?: string;
  /** ONE line — the window this page is reading, or its provenance. */
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <PageHeader
      title={titleOverride ?? surface.label}
      subtitle={subtitle}
      badge={<StatusBadge status={surface.status} tone={STATUS_TONE[surface.status]} />}
      right={
        <>
          {surface.target && <span className="ops-card-meta">Target: {surface.target}</span>}
          {right}
        </>
      }
    />
  );
}

/**
 * What the surface still needs, as dots.
 *
 * A live surface needs nothing, so it renders nothing — the absence IS the
 * status, and a "0 things needed" row would be noise on the one screen that
 * has earned silence.
 */
export function SurfaceHealth({ surface }: { surface: HubSurface }) {
  if (surface.status === "live" || surface.needs.length === 0) return null;
  // The config stores each need as one sentence. The first few words name the
  // thing; the whole sentence is the tooltip.
  const items: HealthItem[] = surface.needs.map((need) => ({
    label: shortLabel(need),
    tooltip: need,
  }));
  return (
    <div className="mt-5">
      <HealthList items={items} />
    </div>
  );
}

/** First clause of a need sentence — enough to name it, short enough to scan.
 *  Trailing connectives and operators are dropped: truncating "Spend entry per
 *  month × market × channel" at five words left a dangling "×". */
function shortLabel(need: string): string {
  const clause = need.split(/[—:(]/)[0].trim();
  const words = clause.split(/\s+/);
  const cut = words.length <= 5 ? words : words.slice(0, 5);
  while (cut.length > 1 && /^(and|or|per|of|the|a|by|for|with|to|in|on|×|x|\+|&)$/i.test(cut[cut.length - 1])) {
    cut.pop();
  }
  return cut.join(" ");
}
