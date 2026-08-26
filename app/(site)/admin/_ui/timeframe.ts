// ─────────────────────────────────────────────────────────────────────────────
// THE timeframe, and its attribution mode. One control in the header, two data
// grains underneath. Extends the Marketing Hub's original month-only model
// (app/(site)/marketing/(hub)/timeframe.ts, which now re-exports from here).
//
// WHY TWO GRAINS. The two data sources are shaped differently and forcing one
// scale onto both would mean inventing numbers:
//
//   day-grain    Redis leads:v1 + Vercel Web Analytics. Real day resolution.
//                Screens: Pages, Leads, Experiments.
//   month-grain  config/appLeadsSnapshot — a monthly export.
//                Screens: Attribution, Markets, Executive, Report, Channels.
//
// A month-grain screen asked for 7d CANNOT answer honestly, so it COERCES to
// the containing month and says so in one line — the pattern Executive already
// used. It never synthesizes day-level detail from monthly data.
//
// State travels in search params (?t=…&a=…) so it survives reloads, is
// shareable, and needs no client store.
// ─────────────────────────────────────────────────────────────────────────────

export type Grain = "day" | "month";

export type Timeframe =
  | { kind: "7d" }
  | { kind: "30d" }
  | { kind: "90d" }
  | { kind: "month"; ym: string }
  | { kind: "3m" }
  | { kind: "12m" }
  | { kind: "ytd" };

export type AttributionMode = "last" | "first";

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_KINDS = ["7d", "30d", "90d"] as const;
const MONTH_KINDS = ["3m", "12m", "ytd"] as const;

export type DayKind = (typeof DAY_KINDS)[number];

/** How many days each day-kind spans. */
export const DAY_SPAN: Record<DayKind, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** Vercel's hard cap at day granularity. Verified against the live API — over
 *  it the response is a 400 `invalid_group_by`, not a truncated result. */
export const DAY_BUCKET_CAP = 62;

/**
 * Vercel's aggregate API caps BUCKETS, not date range: 62 at day granularity,
 * 26 at week. So 90d cannot render 90 daily points — it renders 13 weekly
 * ones. Verified against the live API; see DECISIONS.md.
 *
 * This is the single place that mapping is made, so no caller can request a
 * bucket size the API will reject with a 400.
 */
export function bucketFor(tf: Timeframe): "day" | "week" | "month" {
  switch (tf.kind) {
    case "7d":
    case "30d":
    case "month":
      return "day";
    case "90d":
    case "3m":
      return "week";
    case "12m":
    case "ytd":
      return "month";
  }
}

export function isDayKind(tf: Timeframe): tf is { kind: DayKind } {
  return (DAY_KINDS as readonly string[]).includes(tf.kind);
}

/**
 * Parse ?t=.
 *
 * THE DEFAULT FOLLOWS THE GRAIN. A day-grain screen opening on "Aug 2026" was
 * the bug: the options were right but the fallback always reached for the
 * latest snapshot month, so Pages — which has real day resolution — opened on
 * a monthly window it never needed. Day-grain defaults to 30d; month-grain
 * defaults to the latest month WITH DATA and never invents one.
 */
export function parseTimeframe(
  raw: string | string[] | undefined,
  availableMonths: readonly string[],
  grain: Grain = "month"
): Timeframe {
  const v = typeof raw === "string" ? raw : undefined;
  if (v && (DAY_KINDS as readonly string[]).includes(v)) return { kind: v as DayKind };
  if (v && (MONTH_KINDS as readonly string[]).includes(v)) {
    return { kind: v as (typeof MONTH_KINDS)[number] };
  }
  if (v && YM.test(v) && availableMonths.includes(v)) return { kind: "month", ym: v };
  if (grain === "day") return { kind: "30d" };
  const latest = availableMonths[availableMonths.length - 1];
  return latest ? { kind: "month", ym: latest } : { kind: "ytd" };
}

export function parseAttribution(raw: string | string[] | undefined): AttributionMode {
  return raw === "first" ? "first" : "last";
}

export function timeframeParam(tf: Timeframe): string {
  return tf.kind === "month" ? tf.ym : tf.kind;
}

// ── Coercion ─────────────────────────────────────────────────────────────────

export type Resolved = {
  timeframe: Timeframe;
  /** Set when the requested timeframe could not be answered at this grain.
   *  Screens render this as ONE line. Never silently swallowed. */
  coercedFrom: Timeframe | null;
};

/**
 * Resolve a timeframe for a screen of the given grain.
 *
 * A day-kind on a month-grain screen coerces to the month CONTAINING today —
 * i.e. the latest month with data — because that is the smallest honest window
 * the snapshot can answer. The caller gets `coercedFrom` and must say so.
 *
 * Month-kinds on a day-grain screen are fine: a month is a real range of days,
 * so no information is invented going that direction.
 */
export function resolveForGrain(
  tf: Timeframe,
  grain: Grain,
  availableMonths: readonly string[]
): Resolved {
  if (grain === "month" && isDayKind(tf)) {
    const latest = availableMonths[availableMonths.length - 1];
    return {
      timeframe: latest ? { kind: "month", ym: latest } : { kind: "ytd" },
      coercedFrom: tf,
    };
  }
  return { timeframe: tf, coercedFrom: null };
}

/**
 * What one trend point actually represents, in words, WHENEVER it is coarser
 * than the timeframe implies.
 *
 * 90d cannot render 90 daily points — Vercel's aggregate API caps day
 * granularity at 62 buckets — so it renders 13 weekly ones. A 13-point line
 * under a control that says "Last 90 days" reads as 90 daily points unless
 * something says otherwise. Returns null when the bucket matches the
 * expectation and no label is warranted.
 */
export function resampleNote(tf: Timeframe): string | null {
  const bucket = bucketFor(tf);
  if (isDayKind(tf) && bucket !== "day") {
    return `trend shown ${bucket}ly — ${DAY_SPAN[tf.kind]} days exceeds the ${DAY_BUCKET_CAP}-bucket daily limit`;
  }
  if (tf.kind === "3m" && bucket === "week") return "trend shown weekly";
  return null;
}

/** The one line a coerced screen renders. */
export function coercionNote(from: Timeframe, to: Timeframe, availableMonths: readonly string[]): string {
  return `${timeframeLabel(from, availableMonths)} isn't available here — this screen reads the monthly app snapshot. Showing ${timeframeLabel(to, availableMonths)}.`;
}

// ── Month resolution (unchanged from the Hub's original) ─────────────────────

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
      return all.filter((m) => m.startsWith(latest.slice(0, 4)));
    }
    // Day kinds never resolve to months — a day-grain screen does not use
    // this function, and a month-grain screen coerces before it gets here.
    default:
      return [];
  }
}

/** Day-grain range as ISO dates, for the analytics client. `until` is
 *  exclusive-safe (today); `since` is `span` days back. */
export function dayRange(tf: Timeframe, now = new Date()): { since: string; until: string } | null {
  if (!isDayKind(tf)) return null;
  const until = new Date(now);
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - DAY_SPAN[tf.kind]);
  return { since: since.toISOString().slice(0, 10), until: until.toISOString().slice(0, 10) };
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthShort(ym: string): string {
  return MONTH_ABBR[Number(ym.slice(5)) - 1] ?? ym;
}

export function monthLabel(ym: string): string {
  return `${monthShort(ym)} ${ym.slice(0, 4)}`;
}

export function monthLabelFull(ym: string): string {
  return `${MONTH_FULL[Number(ym.slice(5)) - 1] ?? ym} ${ym.slice(0, 4)}`;
}

export function timeframeLabel(tf: Timeframe, availableMonths: readonly string[]): string {
  switch (tf.kind) {
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
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
