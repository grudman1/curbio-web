// ─────────────────────────────────────────────────────────────────────────────
// Channel taxonomy — the single source of truth for lead attribution channels.
// From the Curbio Attribution System spec: a CLOSED nine-value list. Both the
// client (FormCard / WaitlistPage / analytics) and the lead route import from
// here — the list must never be defined twice again.
//
// Spec rules encoded in deriveChannel():
//   - absent utm_source  → "direct"  (never null, never "landing page")
//   - unknown utm_source → "direct"  (do not mint phantom channels; the raw
//     value still travels in utmSource for audit)
// ─────────────────────────────────────────────────────────────────────────────

export const VALID_CHANNELS = [
  "email",
  "paid_search",
  "paid_social",
  "creator",
  "hsm_field",
  "partnership",
  "organic",
  "referral",
  "direct",
] as const;

export type Channel = (typeof VALID_CHANNELS)[number];

const CHANNEL_SET: ReadonlySet<string> = new Set(VALID_CHANNELS);

/** Map a raw utm_source onto the closed channel list. Always returns a valid
 *  channel — "direct" for absent or unrecognized sources. */
export function deriveChannel(utmSource: string | null | undefined): Channel {
  if (!utmSource) return "direct";
  const lower = utmSource.trim().toLowerCase();
  return CHANNEL_SET.has(lower) ? (lower as Channel) : "direct";
}
