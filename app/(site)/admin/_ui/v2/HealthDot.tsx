// A single glanceable dot. `unknown` is hollow + dashed by the same rule the
// v1 tone scale enforces (DESIGN-APP.md) — a number we don't have must never
// read as a bad one.

export type Health = "good" | "warn" | "bad" | "unknown";

const FILL: Record<Health, string> = {
  good: "bg-ui2-green",
  warn: "bg-ui2-amber",
  bad: "bg-ui2-red",
  unknown: "bg-transparent",
};

const BORDER: Record<Health, string> = {
  good: "border-ui2-green",
  warn: "border-ui2-amber",
  bad: "border-ui2-red",
  unknown: "border-ui2-text-muted",
};

export function HealthDot({ health, title }: { health: Health; title?: string }) {
  return (
    <span
      title={title}
      aria-hidden
      className={`inline-block h-[7px] w-[7px] flex-none rounded-full border-[1.5px] ${BORDER[health]} ${FILL[health]} ${
        health === "unknown" ? "border-dashed" : ""
      }`}
    />
  );
}

/** Small grey dot for "not wired" — top-right of a StatCard, tooltip-only.
 *  Replaces the old dashed pill / ⓘ / "N things needed" pattern (Phase 4
 *  removes those app-wide; this is the one surface that ever needs it). */
export function WiringDot({ tooltip }: { tooltip: string }) {
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className="inline-block h-[6px] w-[6px] flex-none rounded-full bg-ui2-text-muted/40"
    />
  );
}
