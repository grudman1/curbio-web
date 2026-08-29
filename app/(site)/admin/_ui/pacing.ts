// ─────────────────────────────────────────────────────────────────────────────
// Pace math — the one place "are we on pace" is computed, used identically by
// the market cards, the company total, and the alerts panel.
//
// Expected-to-date is honest about coverage: the snapshot reaches its as-of
// date and no further, so for the as-of month the expectation scales by the
// covered days (day 14 of 31 → 45% of the month's target), for complete
// months it is the full target, and for months after the as-of it is zero.
// Comparing day-14 data against a day-17 expectation would manufacture a
// deficit; this module never does.
// ─────────────────────────────────────────────────────────────────────────────

import { monthShort } from "./timeframe";

export type PaceState = "on" | "behind" | "risk";

export type PaceRead = {
  /** Expected Qualified by now, given how much of the timeframe has data. */
  expected: number;
  /** Full-timeframe target (targetPerMonth × months). */
  target: number;
  state: PaceState;
  /** qualified − expected, rounded. Negative = behind. */
  delta: number;
  /** "through Aug 14" when the as-of month is in view, else "complete months". */
  coverage: string;
};

function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Pace for `qualified` over `months`, given the snapshot's as-of date.
 *  Null when the months carry no expectation at all (nothing covered). */
export function paceRead(
  qualified: number,
  months: readonly string[],
  asOf: string,
  targetPerMonth: number
): PaceRead | null {
  if (months.length === 0) return null;
  const asOfMonth = asOf.slice(0, 7);
  const asOfDay = Number(asOf.slice(8, 10));

  let expected = 0;
  let coversAsOfMonth = false;
  for (const m of months) {
    if (m < asOfMonth) expected += targetPerMonth;
    else if (m === asOfMonth) {
      expected += targetPerMonth * (asOfDay / daysInMonth(m));
      coversAsOfMonth = true;
    }
    // m > asOfMonth: no data can exist yet — expectation zero.
  }
  if (expected <= 0) return null;

  const ratio = qualified / expected;
  const state: PaceState = ratio >= 1 ? "on" : ratio >= 0.5 ? "behind" : "risk";
  return {
    expected: Math.round(expected),
    target: targetPerMonth * months.length,
    state,
    delta: Math.round(qualified - expected),
    coverage: coversAsOfMonth
      ? `through ${monthShort(asOfMonth)} ${asOfDay}`
      : "complete months",
  };
}

/** One sentence for a pace read: "3 ahead of pace" / "17 behind pace". */
export function paceSentence(read: PaceRead): string {
  if (read.delta >= 0) return `${read.delta} ahead of pace`;
  return `${-read.delta} behind pace`;
}
