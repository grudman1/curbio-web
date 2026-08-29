// ─────────────────────────────────────────────────────────────────────────────
// Channel taxonomy — the single source of truth for lead attribution channels.
// From the Curbio Attribution System spec (v3.2): a CLOSED TEN-value list —
// `event` added ahead of the October event push (webinars, conference booths,
// open houses are a funded motion under the spend test). `mail` is documented
// as next-in-line, added only when the direct-mail motion launches. Both the
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
  "event",
] as const;

export type Channel = (typeof VALID_CHANNELS)[number];

const CHANNEL_SET: ReadonlySet<string> = new Set(VALID_CHANNELS);

/**
 * THE channel colour map — one fixed colour per channel, used by every chart
 * in the Marketing Hub. Defined here, beside the closed list itself, so a
 * chart can never invent a palette. Muted on purpose, and none of these hues
 * approach the state colours (green / amber / red mean on-pace / behind /
 * at-risk and nothing else). `direct` is grey because it is the absence of
 * attribution — unattributed traffic must never look like a channel win.
 */
export const CHANNEL_COLORS: Record<Channel, string> = {
  creator: "#8f62c0", // violet
  partnership: "#4467c4", // indigo
  hsm_field: "#2f8bb5", // cyan-blue
  email: "#2e9188", // teal
  paid_search: "#b8538f", // magenta
  paid_social: "#c4785e", // terracotta
  organic: "#7a8f3d", // olive
  referral: "#5b7d8f", // slate
  event: "#a08a3c", // ochre
  direct: "#9aa3ad", // grey — no known channel
};

/** Map a raw utm_source onto the closed channel list. Always returns a valid
 *  channel — "direct" for absent or unrecognized sources. */
export function deriveChannel(utmSource: string | null | undefined): Channel {
  if (!utmSource) return "direct";
  const lower = utmSource.trim().toLowerCase();
  return CHANNEL_SET.has(lower) ? (lower as Channel) : "direct";
}
