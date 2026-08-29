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
      className={`inline-block h-2 w-2 flex-none rounded-full border-[1.5px] ${BORDER[health]} ${FILL[health]} ${
        health === "unknown" ? "border-dashed" : ""
      }`}
    />
  );
}

/** "Not wired" — top-right of a StatCard, tooltip-only. HOLLOW AND DASHED,
 *  matching the `unknown` health dot above and for the same reason: an absent
 *  number must not read as a measured one. A filled grey dot did read as
 *  measured-and-neutral, which is a different claim.
 *
 *  The tooltip carries what the metric needs. That sentence used to be
 *  printed on the card ("needs the spend store"); it is backlog, not
 *  reporting, so it moved behind the hover. */
export function WiringDot({ tooltip }: { tooltip: string }) {
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      role="img"
      className="inline-block h-2 w-2 flex-none rounded-full border border-dashed border-ui2-gray-400 bg-transparent"
    />
  );
}
