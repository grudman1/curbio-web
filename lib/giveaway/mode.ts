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
// ── Two questions, answered separately ──────────────────────────────────────
//
//   WHERE do entries go?      storeScope()    the real list, or the sandbox one
//   DOES anything leave?      deliveryMode()  the app + ActiveCampaign, or not
//
// GIVEAWAY_DELIVERY overrides the second in either direction:
//
//   live      exercise the real delivery code against mock servers in local
//             development. Entries then go to the real keys of whatever store
//             is configured, so a local run looks like production end to end.
//   sandbox   stop deliveries on a production deployment without a code
//             change. It does NOT move the entries: someone who enters while
//             it is set is still in the real drawing, marked "(sandbox)" as
//             not yet sent, and can be sent from the entries screen once it is
//             lifted. An emergency brake must not quietly drop entrants out of
//             a prize drawing.
// ─────────────────────────────────────────────────────────────────────────────

export type DeliveryMode = "live" | "sandbox";

function override(): DeliveryMode | null {
  const value = process.env.GIVEAWAY_DELIVERY;
  return value === "live" || value === "sandbox" ? value : null;
}

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function deliveryMode(): DeliveryMode {
  return override() ?? (isProduction() ? "live" : "sandbox");
}

export function storeScope(giveaway: Giveaway): StoreScope {
  // Production always uses the real list, whatever the override says.
  const real = isProduction() || override() === "live";
  return { slug: giveaway.slug, sandbox: !real };
}

/** Has the entry period ended? The server's clock, never the visitor's. */
export function isClosed(giveaway: Giveaway, now: number = Date.now()): boolean {
  return now >= Date.parse(giveaway.closesAt);
}
