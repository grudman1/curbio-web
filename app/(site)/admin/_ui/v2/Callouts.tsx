import Link from "next/link";

// "What's in the way" — the things worth knowing, pulled from every source the
// app has: the app snapshot, the Redis lead store, and the campaign registry.
//
// ── Why it merges sources ──────────────────────────────────────────────────
// A pacing shortfall and a CRM delivery failure are the same KIND of fact to
// whoever opens this screen — something is wrong and it is costing leads — but
// they live in completely different systems and used to surface in different
// places (or, for delivery failures, only inside the Leads screen). Ranking
// them against each other is the whole point: 12 leads that never reached the
// CRM outrank a market that is 4 behind, whatever system each came from.
//
// ── A title that needs a paragraph is the wrong title ──────────────────────
// Each row is rank, title, chip, destination. No detail line, no footer note.
// If a row cannot be understood from its title and its number, the fix is a
// better title, not a sentence underneath explaining the one above. Everything
// a detail line would have said lives on the screen the row links to.

export type CalloutSeverity = "error" | "warning";

export type Callout = {
  key: string;
  severity: CalloutSeverity;
  /** Reads on its own. No sentence follows it. */
  title: string;
  /** Signed magnitude for the chip. null renders an em-dash. */
  delta: number | null;
  /** "pts", "%" — appended to the magnitude. Omit for a bare count. */
  deltaUnit?: string;
  /** Which literal direction is good news for this row's delta. */
  goodDirection: "up" | "down";
  href: string;
  /** The destination's name — the row's right-hand affordance. */
  linkLabel: string;
  /** Leads at stake. The ranking key within a severity band. */
  atStake: number;
};

export function Callouts({ items, meta }: { items: Callout[]; meta: string }) {
  return (
    <section className="ops-card overflow-hidden">
      <div className="ops-card-head">
        <span
          className="ops-dot"
          style={{ background: items.some((i) => i.severity === "error")
            ? "var(--ops-error-500)"
            : items.length > 0
              ? "var(--ops-warning-500)"
              : "var(--ops-success-500)" }}
          aria-hidden
        />
        <h2 className="ops-card-title">What&rsquo;s in the way</h2>
        {/* A label, not a caption: it states the ranking key and the window,
            which the numbers below are meaningless without. */}
        <span className="ops-card-meta">{meta}</span>
      </div>

      {items.length === 0 ? (
        <p
          className="ops-muted m-0 border-t px-5 py-8 text-center text-[14px]"
          style={{ borderColor: "var(--ops-divider)" }}
        >
          Every market is on pace, every lead is attributed, and nothing failed delivery.
        </p>
      ) : (
        <ol className="m-0 list-none p-0">
          {items.map((c, i) => (
            <li key={c.key} className="border-t" style={{ borderColor: "var(--ops-divider)" }}>
              <Link
                href={c.href}
                className="ops-tbody-row--link flex items-center gap-3.5 px-5 py-3.5 no-underline"
              >
                <span
                  className="ops-tnum ops-subtle w-4 flex-none text-[12px] font-bold"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="min-w-0 flex-1 text-[14px] font-semibold"
                  style={{ color: "var(--ops-text)" }}
                >
                  {c.title}
                </span>
                <Chip value={c.delta} unit={c.deltaUnit} goodDirection={c.goodDirection} />
                <span className="ops-subtle w-[104px] flex-none text-right text-[12px]">
                  {c.linkLabel} ›
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** A signed count, tinted by whether that direction is good for this row. The
 *  sign is always literal; only the colour depends on direction. */
function Chip({
  value,
  unit,
  goodDirection,
}: {
  value: number | null;
  unit?: string;
  goodDirection: "up" | "down";
}) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="ops-badge ops-badge--neutral flex-none">—</span>;
  }
  const flat = value === 0;
  const favorable = value > 0 === (goodDirection === "up");
  const tone = flat ? "neutral" : favorable ? "success" : "error";
  return (
    <span className={`ops-badge ops-badge--${tone} flex-none`}>
      {value > 0 ? "+" : value < 0 ? "−" : ""}
      {Math.abs(value)}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}
