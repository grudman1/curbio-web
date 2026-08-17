// ─────────────────────────────────────────────────────────────────────────────
// The Hub's ONE timeframe, and its attribution mode — parsed from the URL.
//
// The month selector and attribution toggle live in the layout header and
// govern every screen at once; this module is the contract between them.
// State travels in search params (?t=2026-08&a=first) so it survives reloads,
// is shareable as a link, and needs no client store. Pages parse the same
// params server-side with the same functions the header uses.
//
// The fix this encodes: one timeframe on screen at a time. A YTD table with
// this-month progress bars under it was two timeframes in one view — now YTD
// is an explicit choice in the selector, never an implicit second reading.
// ─────────────────────────────────────────────────────────────────────────────

export type Timeframe =
  | { kind: "month"; ym: string }
  | { kind: "3m" }
  | { kind: "12m" }
  | { kind: "ytd" };

export type AttributionMode = "last" | "first";

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Parse ?t=. Unknown or absent values fall back to the LATEST month with
 *  data — the default screen is always "this month as of the snapshot". */
export function parseTimeframe(
  raw: string | string[] | undefined,
  availableMonths: readonly string[]
): Timeframe {
  const v = typeof raw === "string" ? raw : undefined;
  if (v === "3m" || v === "12m" || v === "ytd") return { kind: v };
  if (v && YM.test(v) && availableMonths.includes(v)) return { kind: "month", ym: v };
  const latest = availableMonths[availableMonths.length - 1];
  return latest ? { kind: "month", ym: latest } : { kind: "ytd" };
}

export function parseAttribution(raw: string | string[] | undefined): AttributionMode {
  return raw === "first" ? "first" : "last";
}

/** Serialize back to the ?t= value. */
export function timeframeParam(tf: Timeframe): string {
  return tf.kind === "month" ? tf.ym : tf.kind;
}

/** The months (ascending "YYYY-MM") a timeframe covers, resolved against the
 *  months that actually have data. Never invents a month. */
export function monthsFor(tf: Timeframe, availableMonths: readonly string[]): string[] {
  const all = [...availableMonths].sort();
  switch (tf.kind) {
    case "month":
      return all.includes(tf.ym) ? [tf.ym] : [];
    case "3m":
      return all.slice(-3);
    case "12m":
      return all.slice(-12);
    case "ytd": {
      const latest = all[all.length - 1];
      if (!latest) return [];
      const year = latest.slice(0, 4);
      return all.filter((m) => m.startsWith(year));
    }
  }
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthShort(ym: string): string {
  return MONTH_ABBR[Number(ym.slice(5)) - 1] ?? ym;
}

/** "2026-08" → "Aug 2026". */
export function monthLabel(ym: string): string {
  return `${monthShort(ym)} ${ym.slice(0, 4)}`;
}

/** "2026-08" → "August 2026". */
export function monthLabelFull(ym: string): string {
  return `${MONTH_FULL[Number(ym.slice(5)) - 1] ?? ym} ${ym.slice(0, 4)}`;
}

/** Selector / provenance label for a timeframe. */
export function timeframeLabel(tf: Timeframe, availableMonths: readonly string[]): string {
  switch (tf.kind) {
    case "month":
      return monthLabel(tf.ym);
    case "3m":
    case "12m": {
      const months = monthsFor(tf, availableMonths);
      const span =
        months.length > 1
          ? ` (${monthShort(months[0])}–${monthShort(months[months.length - 1])})`
          : "";
      return `Last ${tf.kind === "3m" ? 3 : 12} months${span}`;
    }
    case "ytd": {
      const months = monthsFor(tf, availableMonths);
      return months.length ? `YTD ${months[0].slice(0, 4)}` : "YTD";
    }
  }
}
