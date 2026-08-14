"use client";

// ─────────────────────────────────────────────────────────────────────────────
// One event, both destinations.
//
// GA4 and PostHog run side by side. Rather than adding a parallel
// posthog.capture() next to every existing gaEvent() call — which is how two
// analytics systems silently drift apart until nobody trusts either — every
// funnel event goes through trackEvent() and fans out here.
//
// gaEvent() stays GA-only and is still the GA implementation; this is a layer
// above it, not a replacement. The existing events (cta_click, form_start,
// lead_submit, booking_view, booking_complete) were REUSED by switching their
// call sites to this function, not re-emitted under new names.
//
// PII rule, unchanged and now enforced on two vendors: name, email, phone and
// address must never appear in `params`. Attribution, market, variant and
// channel only — see the super properties in lib/posthog.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { gaEvent } from "./analytics";
import { posthogCapture } from "./posthog";

/** The funnel. Typed so a typo'd event name fails the build rather than
 *  quietly creating a new event nobody is charting. */
export type EventName =
  | "cta_click"
  | "form_start"
  | "lead_submit"
  | "market_select"
  | "booking_view"
  | "booking_complete"
  | "booking_declined"
  | "scroll_depth";

export function trackEvent(
  name: EventName,
  params: Record<string, string | number | null | undefined> = {}
): void {
  // GA4 takes strings only; it drops null/empty itself.
  const gaParams: Record<string, string | null | undefined> = {};
  for (const [k, v] of Object.entries(params)) {
    gaParams[k] = typeof v === "number" ? String(v) : v;
  }
  gaEvent(name, gaParams);
  posthogCapture(name, params);
}
