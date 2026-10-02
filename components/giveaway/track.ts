"use client";

import { track } from "@vercel/analytics";
import { gaEvent } from "@/lib/analytics";
import { posthogCapture } from "@/lib/posthog";

// ─────────────────────────────────────────────────────────────────────────────
// Giveaway analytics — its own event names, on purpose.
//
// An entry is NOT `lead_submit`. That event is the lead funnel's conversion in
// GA4, PostHog and Vercel Analytics, and "Qualified = estimate requests only"
// (config/marketingHub.ts). A few hundred people entering a prize drawing
// reported as lead_submit would be the dashboard equivalent of counting
// business cards in a fishbowl as sales.
//
// So:   giveaway_entry     someone entered
//       giveaway_booking   an entrant booked a call from the page
//
// The same fan-out lib/events.ts does — GA4 and PostHog from one call, so the
// two cannot drift — plus Vercel Analytics. It lives here rather than as two
// more names in that file's EventName union only because that file is
// imported by the lead form, and nothing on the lead form's path is being
// touched this week. Fold these into trackEvent() afterwards.
//
// PII rule, unchanged: no name, email or phone. Market, answer, channel only.
// ─────────────────────────────────────────────────────────────────────────────

export type GiveawayEvent = "giveaway_entry" | "giveaway_booking";

export function trackGiveaway(name: GiveawayEvent, params: Record<string, string | null | undefined>): void {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) if (v) clean[k] = v;
  gaEvent(name, clean);
  posthogCapture(name, clean);
  track(name, clean);
}
