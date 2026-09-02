// ─────────────────────────────────────────────────────────────────────────────
// INSTANTLY EVENT VOCABULARY — learned from live traffic, not guessed.
//
// Instantly has zero campaigns until cold sends start this week, so there is no
// live delivery to read the real `event_type` strings from yet. The webhook
// therefore subscribes to ALL EVENTS and persists every raw payload before
// parsing anything. The list below is what we currently believe; the store is
// what actually knows.
//
// WHY NOT A FILTERED SUBSCRIPTION: a filtered subscription throws away the
// evidence. If our guess at a string is wrong, a filter means the event never
// arrives and nothing anywhere records that it was missed. Subscribing to
// everything and persisting raw means a wrong guess costs us a parse, not the
// data.
//
// The previous webhook is the worked example: it filtered on
// `event_type === "email.replied"` — dot notation, invented — and returned 200
// for everything else. Every real event would have been acknowledged and
// dropped. That is the same failure class as an unrecognised utm_source
// falling through to `direct`: a wrong answer that looks like a working
// system.
//
// ONE CONFIRMED STRING: `campaign_completed_for_lead_without_reply`, which is
// snake_case matching the Instantly UI label. Others are ASSUMED to follow that
// pattern and are marked as such below. Nothing is hardcoded against the
// assumption — an unrecognised type is stored and surfaced, never dropped.
// ─────────────────────────────────────────────────────────────────────────────

/** Confirmed against the Instantly UI. */
export const CONFIRMED_EVENT_TYPES = ["campaign_completed_for_lead_without_reply"] as const;

/**
 * ASSUMED to follow the confirmed snake_case pattern. Unverified until the
 * first live delivery. Being wrong about one of these costs a parse, not the
 * event — the raw payload is persisted either way and the unrecognised type is
 * surfaced for correction.
 */
export const ASSUMED_EVENT_TYPES = [
  "lead_marked_interested",
  "lead_marked_not_interested",
  "reply_received",
  "email_sent",
  "email_opened",
  "email_link_clicked",
  "email_bounced",
  "lead_unsubscribed",
] as const;

/**
 * Events that mark a lead as GENUINELY ENGAGED and therefore eligible for the
 * promotion queue.
 *
 * Deliberately NOT here, and the reasons are the whole point of the gate:
 *
 *   reply_received       — "remove me from your list" is a reply, and so is
 *                          every out-of-office. Promoting on a raw reply
 *                          imports unsubscribe requests into the warm list we
 *                          are protecting.
 *   email_link_clicked   — corporate email security scanners click every link
 *                          in inbound mail before a human sees it, and
 *                          brokerage IT is exactly that environment. A click
 *                          is frequently a machine.
 *
 * Instantly's Interested label is itself AI-generated from reply content, which
 * is why entering this list means entering a QUEUE, not the warm list. A human
 * approves every promotion.
 */
export const POSITIVE_EVENT_TYPES = ["lead_marked_interested"] as const;

/**
 * Positive CUSTOM labels, matched case-insensitively against the payload's
 * label field. Instantly lets the workspace define its own; these are the ones
 * that mean the same thing as Interested. Extend as labels are created —
 * an unmatched label surfaces rather than silently failing to qualify.
 */
export const POSITIVE_CUSTOM_LABELS = ["interested", "meeting request", "meeting booked"] as const;

export const KNOWN_EVENT_TYPES: readonly string[] = [
  ...CONFIRMED_EVENT_TYPES,
  ...ASSUMED_EVENT_TYPES,
];

export function isKnownEventType(t: string): boolean {
  return KNOWN_EVENT_TYPES.includes(t);
}

/**
 * Does this event mean "genuinely engaged"?
 *
 * Matches either a positive event type or a positive custom label. Anything
 * else — including any event type we have never seen — returns false, so an
 * unknown string can never promote someone by accident. It surfaces instead.
 */
export function isPositiveEvent(eventType: string, label?: string | null): boolean {
  if ((POSITIVE_EVENT_TYPES as readonly string[]).includes(eventType)) return true;
  if (!label) return false;
  const l = label.trim().toLowerCase();
  return (POSITIVE_CUSTOM_LABELS as readonly string[]).includes(l);
}

/**
 * The fields Instantly's payload is documented to carry. Everything is
 * optional because the webhook must never reject a payload for shape — an
 * unexpected shape is data to look at, not an error to return.
 */
export type InstantlyEvent = {
  event_type?: string;
  campaign_name?: string;
  campaign_id?: string;
  workspace?: string;
  timestamp?: string;
  lead_email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  website?: string;
  phone?: string;
  step?: string | number;
  email_account?: string;
  /** Present on classification events; the exact key is unconfirmed, so the
   *  parser reads several candidates. */
  label?: string;
  lead_label?: string;
  status_label?: string;
  /** Reply body, when the event carries one. Key unconfirmed — see parser. */
  reply_text?: string;
  reply_text_snippet?: string;
  [k: string]: unknown;
};

/** The label, wherever Instantly put it. Reads candidates rather than assuming
 *  one key, because the key name is unconfirmed until first delivery. */
export function readLabel(e: InstantlyEvent): string | null {
  return e.label ?? e.lead_label ?? e.status_label ?? null;
}

/** The reply body, wherever Instantly put it. Same reasoning as readLabel. */
export function readReplyText(e: InstantlyEvent): string | null {
  const v = e.reply_text ?? e.reply_text_snippet ?? null;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
