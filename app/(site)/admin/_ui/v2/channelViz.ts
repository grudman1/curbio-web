import type { Channel } from "@/lib/channels";

// One colour per channel, for every surface on Home that draws a channel:
// the stacked bars, the legend, the breakdown panel, the table swatches.
//
// VALUES ARE TOKEN REFERENCES, not hex — the literal colours live in
// tokens.css under `.ops` (`--ops-ch-*`), so a palette change is a token
// change and this file cannot drift from the stylesheet. They are `var(…)`
// strings rather than Tailwind class names because Tailwind's JIT cannot see
// a class assembled at runtime, and a hand-maintained safelist of ten literal
// class names is a second place to forget a channel.
//
// The mapping is EXHAUSTIVE over lib/channels.ts's closed nine — the Record
// type makes adding a tenth channel a build error here, which is the point.
export const CHANNEL_INK: Record<Channel, string> = {
  partnership: "var(--ops-ch-partnership)",
  email: "var(--ops-ch-email)",
  organic: "var(--ops-ch-organic)",
  paid_search: "var(--ops-ch-paid-search)",
  paid_social: "var(--ops-ch-paid-social)",
  creator: "var(--ops-ch-creator)",
  hsm_field: "var(--ops-ch-events)",
  referral: "var(--ops-ch-referral)",
  // Grey, and grey on purpose: `direct` is the ABSENCE of attribution, so it
  // must never read as a channel doing well. See lib/channels.ts.
  direct: "var(--ops-ch-direct)",
};

/** The label the chart legend and table rows use. `direct` is called what it
 *  is — unattributed — rather than borrowing a channel's name. */
export function channelLabel(c: Channel, labels: Record<Channel, string>): string {
  return c === "direct" ? "Unattributed" : labels[c];
}
