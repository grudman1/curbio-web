import type { Giveaway } from "@/config/giveaways";
import type { StoreScope } from "./store";

// ─────────────────────────────────────────────────────────────────────────────
// LIVE OR SANDBOX — decided once, here.
//
// Vercel's Preview environment shares Production's Upstash database, Resend
// key and CRM webhook (checked with `vercel env ls` on 2026-10-01). That means
// a form submitted on a preview link is, by default, a REAL submission: it
// lands in the production store, emails a real person, and creates a real
// deal with a real HSM's name on it.
//
// For a page that exists to be clicked through on a preview link before it
// goes live, that is the wrong default. So the giveaway is live only where
// Vercel says the deployment is production, and everywhere else:
//
//   - entries are written under separate `:sandbox` keys
//   - nothing is posted to the app, nothing is added to ActiveCampaign, and
//     no notification email is sent
//   - each entry records what WOULD have happened, so the preview still shows
//     the routing working
//
// GIVEAWAY_DELIVERY overrides it in either direction — `live` to exercise the
// real code paths against mock servers in local development, `sandbox` to
// neutralise a production deployment in an emergency without a code change.
// ─────────────────────────────────────────────────────────────────────────────

export type DeliveryMode = "live" | "sandbox";

export function deliveryMode(): DeliveryMode {
  const override = process.env.GIVEAWAY_DELIVERY;
  if (override === "live" || override === "sandbox") return override;
  return process.env.VERCEL_ENV === "production" ? "live" : "sandbox";
}

export function storeScope(giveaway: Giveaway): StoreScope {
  return { slug: giveaway.slug, sandbox: deliveryMode() === "sandbox" };
}

/** Has the entry period ended? The server's clock, never the visitor's. */
export function isClosed(giveaway: Giveaway, now: number = Date.now()): boolean {
  return now >= Date.parse(giveaway.closesAt);
}
