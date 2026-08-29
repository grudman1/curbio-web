// ─────────────────────────────────────────────────────────────────────────────
// Which month a month-series panel opens on.
//
// Extracted from QualifiedByMonth so it can be tested without rendering, and
// so there is exactly ONE definition of "the month the page is scoped to".
// The bug this guards against was two definitions drifting apart: the month
// LABELS rendered from `selected` while the breakdown panel opened on the last
// month of the series, so selecting April left the labels on April and the
// numbers on August (regressed in #101, fixed here).
//
// Pure and dependency-free on purpose — see monthFocus.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** The minimum a month needs for focus to be decidable. */
export type FocusableMonth = { selected: boolean };

/**
 * Index of the month a panel should open on: the NEWEST selected month, or
 * the last month in the series when the window selects nothing.
 *
 * Newest-selected rather than oldest: a multi-month window (YTD, last 6) is
 * reported through to its most recent month, so that is the one the breakdown
 * should describe.
 */
export function defaultMonthIndex(months: readonly FocusableMonth[]): number {
  const last = months.length - 1;
  return months.reduce((acc, m, i) => (m.selected ? i : acc), last);
}
