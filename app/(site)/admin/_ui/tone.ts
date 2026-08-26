// ─────────────────────────────────────────────────────────────────────────────
// THE tone scale. One vocabulary for pace, delivery and wiring alike.
// See DECISIONS.md → "One tone scale in /admin, and `unknown` is not on it".
//
// Before this file there were three: PACE_TONE (on/behind/risk), STATUS_TONE
// (live/partial/waiting) and deliveryState (ok/warn/fail/unknown), all
// resolving to the same three constants — so green meant three different
// things depending on which panel you were looking at.
//
// The load-bearing rule: `unknown` is NOT on the good/warn/bad ramp. It is
// grey and dashed, always. A number we do not have must never look like a
// number that is bad. This is the same rule lib/adminLeads.ts already enforces
// in data (a lead predating the delivery hash reports "unknown", never
// "failed") — expressed in colour so it survives a glance.
// ─────────────────────────────────────────────────────────────────────────────

export type Tone = "good" | "warn" | "bad" | "unknown";

/** Text colour. `warn` resolves to the DARKER amber step, never the accent
 *  itself — amber fails WCAG AA as small text on white. */
export const TONE_TEXT: Record<Tone, string> = {
  good: "text-tone-good",
  warn: "text-tone-warn-text",
  bad: "text-tone-bad",
  unknown: "text-tone-unknown",
};

/** Dot / swatch fill. `unknown` is hollow — see DOT_HOLLOW below. */
export const TONE_BG: Record<Tone, string> = {
  good: "bg-tone-good",
  warn: "bg-tone-warn",
  bad: "bg-tone-bad",
  unknown: "bg-transparent",
};

export const TONE_BORDER: Record<Tone, string> = {
  good: "border-tone-good",
  warn: "border-tone-warn",
  bad: "border-tone-bad",
  unknown: "border-tone-unknown",
};

/** `unknown` renders hollow and dashed everywhere it appears. The two
 *  properties travel together so no caller can produce a filled `unknown`. */
export function isUnknown(tone: Tone): boolean {
  return tone === "unknown";
}

// ── Domain → tone. The ONLY place each mapping is written. ───────────────────

/** Pace against target. Was PACE_TONE in hubUi.tsx. */
export const PACE_TONE: Record<"on" | "behind" | "risk", Tone> = {
  on: "good",
  behind: "warn",
  risk: "bad",
};

/** Hub surface wiring. Was STATUS_TONE in hubUi.tsx. Note `waiting` maps to
 *  `unknown`, not to a dimmed good — an unwired surface has no state yet. */
export const WIRING_TONE: Record<"live" | "partial" | "waiting", Tone> = {
  live: "good",
  partial: "warn",
  waiting: "unknown",
};

/** Page registry status. `planned` is unknown: it does not exist to be
 *  healthy or unhealthy. */
export const PAGE_STATUS_TONE: Record<"live" | "stub" | "planned", Tone> = {
  live: "good",
  stub: "warn",
  planned: "unknown",
};

/** Lead delivery. Mirrors deliveryState() in lib/adminLeads.ts, whose four
 *  return tones are this scale's four names by design. */
export const DELIVERY_TONE: Record<"ok" | "warn" | "fail" | "unknown", Tone> = {
  ok: "good",
  warn: "warn",
  fail: "bad",
  unknown: "unknown",
};
