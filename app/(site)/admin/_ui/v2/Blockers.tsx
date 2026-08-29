import Link from "next/link";

// "What's in the way" — the ranked list of what is costing the most leads.
//
// ── A title that needs a paragraph is the wrong title ───────────────────────
// Each row is: rank, title, delta chip, destination. There is no detail line
// and no footer note, and that constraint is the point rather than a
// simplification of it — if a row cannot be understood from its title and its
// number, the fix is a better title, not a sentence underneath explaining the
// one above. Everything a detail line would have said is on the screen the
// row links to, which is where a reader who wants it is going anyway.
//
// The chip is the DIRECTION OF TRAVEL (vs the prior period, same day-of-month
// cut), while the title is the CURRENT STATE. They can disagree — "Riverside
// is 20 behind pace" with a green +2 means a bad position that is improving —
// and that pairing is more useful than either half alone.

export type Blocker = {
  key: string;
  /** Reads on its own. No sentence follows it. */
  title: string;
  /** Signed change vs the prior period. null = no comparable prior period. */
  delta: number | null;
  /** Rendered after the number, e.g. "pts". Omit for a bare count. */
  deltaUnit?: string;
  /** Which literal direction is good news for this row's delta. */
  goodDirection: "up" | "down";
  href: string;
  /** The destination's name — the row's right-hand affordance. */
  linkLabel: string;
};

export function Blockers({ items, meta }: { items: Blocker[]; meta: string }) {
  return (
    <section className="overflow-hidden rounded-ui2-card border border-ui2-border bg-ui2-card shadow-ui2-card">
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-3.5">
        <span className="h-2 w-2 flex-none rounded-[var(--ui2-radius-pill)] bg-ui2-amber" aria-hidden />
        <h2 className="m-0 font-ui2 text-ui2-section font-bold text-ui2-text">
          What&rsquo;s in the way
        </h2>
        {/* A label, not a caption: it states the ranking key and the window,
            which the numbers below are meaningless without. */}
        <span className="font-ui2 text-ui2-caption text-ui2-gray-400">{meta}</span>
      </div>

      {items.length === 0 ? (
        <p className="m-0 border-t border-ui2-divider px-5 py-6 text-center font-ui2 text-[length:var(--ui2-text-row)] text-ui2-text-muted">
          Every market is on pace and every lead is attributed.
        </p>
      ) : (
        <ol className="m-0 list-none p-0">
          {items.map((b, i) => (
            <li key={b.key} className="border-t border-ui2-divider">
              <Link
                href={b.href}
                className="flex items-center gap-3.5 px-5 py-3.5 no-underline transition-colors duration-fast ease-out hover:bg-ui2-well"
              >
                <span
                  className="w-4 flex-none font-ui2 text-ui2-caption font-extrabold tabular-nums text-ui2-gray-400"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 font-ui2 text-[length:var(--ui2-text-row)] font-semibold text-ui2-text">
                  {b.title}
                </span>
                <DeltaPill value={b.delta} unit={b.deltaUnit} goodDirection={b.goodDirection} />
                <span className="w-[92px] flex-none text-right font-ui2 text-ui2-caption text-ui2-gray-400">
                  {b.linkLabel} ›
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** A signed count, tinted by whether that direction is good for this row.
 *  Distinct from DeltaChip, which renders a PERCENTAGE and carries a trailing
 *  label — these are absolute leads, and the window is stated once in the
 *  section header rather than repeated on every row. */
function DeltaPill({
  value,
  unit,
  goodDirection,
}: {
  value: number | null;
  unit?: string;
  goodDirection: "up" | "down";
}) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <span className="flex-none rounded-[var(--ui2-radius-pill)] bg-ui2-well px-2 py-[3px] font-ui2 text-ui2-caption font-bold text-ui2-gray-400">
        —
      </span>
    );
  }
  const flat = value === 0;
  const favorable = value > 0 === (goodDirection === "up");
  const tone = flat
    ? "bg-ui2-well text-ui2-gray-400"
    : favorable
      ? "bg-ui2-green-10 text-ui2-green"
      : "bg-ui2-red-10 text-ui2-red";
  return (
    <span
      className={`flex-none whitespace-nowrap rounded-[var(--ui2-radius-pill)] px-2 py-[3px] font-ui2 text-ui2-caption font-bold tabular-nums ${tone}`}
    >
      {value > 0 ? "+" : value < 0 ? "−" : ""}
      {Math.abs(value)}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}
