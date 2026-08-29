import Link from "next/link";

// A set of things measured against a shared target — markets against pace,
// channels against share. Name and sub-label left, bar and figure right.
//
// This is the densest honest way to show a small set of comparable numbers.
// A table of the same data needs column headers to be readable and gives every
// row equal visual weight; the bars make the shape of the set legible before
// any number is read, which is what "which market is furthest behind" actually
// wants.
//
// Rows carry no explanatory text. The sub-label is `got of expected` — a
// measurement, not a sentence about it.

export type ProgressRow = {
  key: string;
  name: string;
  /** "21 of 23" — the raw pair behind the percentage. */
  sub?: string;
  /** 0…1. Values above 1 clamp the bar but not the figure. */
  ratio: number;
  /** Pre-formatted right-hand figure — "91%", "45". */
  figure: string;
  href?: string;
  /** Amber marks the metric under scrutiny (pace); navy is the neutral default. */
  tone?: "brand" | "accent";
};

export function ProgressRows({ rows }: { rows: ProgressRow[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((r) => {
        const body = (
          <>
            <span className="min-w-0 flex-1">
              <span className="ops-prow-name block truncate">{r.name}</span>
              {r.sub && <span className="ops-prow-sub">{r.sub}</span>}
            </span>
            <span className="flex w-[46%] max-w-[190px] flex-none items-center gap-3">
              <span className="ops-track">
                <span
                  className={`ops-track-fill${r.tone === "accent" ? " ops-track-fill--accent" : ""}`}
                  style={{ width: `${Math.min(100, Math.max(0, r.ratio * 100)).toFixed(1)}%` }}
                />
              </span>
              <span className="ops-prow-figure">{r.figure}</span>
            </span>
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link href={r.href} className="ops-prow no-underline">
                {body}
              </Link>
            ) : (
              <div className="ops-prow">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
