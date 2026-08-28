const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "2026-08-14" → "Aug 14". No Intl/locale — the input is always this exact
 *  ISO shape (SNAPSHOT_AS_OF), so a manual parse avoids a timezone footgun
 *  (`new Date("2026-08-14")` is UTC midnight, which can render as the 13th
 *  in a browser west of UTC). */
export function formatFreshness(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  const [, , mm, dd] = m;
  const month = MONTHS[Number(mm) - 1];
  return month ? `${month} ${Number(dd)}` : isoDate;
}
