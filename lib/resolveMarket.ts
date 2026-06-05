import { headers } from "next/headers";
import { getOperatorLead } from "./operator";
import {
  buildResolvedMarket,
  canonicalZipForSlug,
  nearestServedMarket,
  type ResolvedMarket,
} from "./markets";

export type MarketResolution = {
  market: ResolvedMarket | null;
  source: "param" | "zip" | "geo" | "out-of-area" | "none";
  /** Set when source === "out-of-area" — prefills the waitlist ZIP field. */
  outZip?: string;
  /** Vercel IP city (decoded), forwarded to the waitlist for CRM context. */
  geoCity?: string;
  /** Vercel IP state code (e.g. "MD"). */
  geoRegion?: string;
};

/**
 * Server-side market resolution. Priority:
 *   0. ?status=waitlist           → out-of-area waitlist view
 *   1. ?market= campaign slug     → confirmed market
 *   2. explicit ?zip=/?code=      → confirmed market OR out-of-area
 *                                   (NEVER falls through to geo — the visitor
 *                                    told us exactly where they are)
 *   3. Vercel IP geolocation      → market if matched; NEUTRAL if not
 *                                   (IP is imprecise — never declare out-of-area
 *                                    from a fuzzy IP, only pick a market from it)
 *   4. neutral "choose your market" state
 *
 * Root-cause fix for the Denver-→-Joshua bug: step 2 used to call
 * buildResolvedMarket() and fall through to geo when it returned null
 * (i.e. when isOutOfMarket was true). Now we inspect the raw lead first
 * and return "out-of-area" immediately on any definitive API response,
 * regardless of outcome.
 */
export async function resolveMarket(searchParams: {
  market?: string;
  zip?: string;
  code?: string;
  status?: string;
}): Promise<MarketResolution> {
  // 0. ?status=waitlist — direct-link entry to the out-of-area waitlist view.
  if (searchParams.status === "waitlist") {
    const zip = (searchParams.zip ?? "").replace(/\D/g, "").slice(0, 5);
    try {
      const h = await headers();
      return {
        market: null,
        source: "out-of-area",
        outZip: zip,
        geoCity: decodeURIComponent(h.get("x-vercel-ip-city") ?? "") || undefined,
        geoRegion: h.get("x-vercel-ip-country-region") ?? undefined,
      };
    } catch {
      return { market: null, source: "out-of-area", outZip: zip };
    }
  }

  // 1. ?market= campaign slug → canonical zip → live API.
  if (searchParams.market) {
    const zip = canonicalZipForSlug(searchParams.market);
    if (zip) {
      const market = buildResolvedMarket(await getOperatorLead(zip));
      if (market) return { market, source: "param" };
    }
  }

  // 2. Explicit zip entry (?zip= or ?code=).
  //
  // THE FIX: check the raw lead before building. If the API returned any
  // response (non-null), that is a definitive answer — do not fall through
  // to geo. A visitor who typed a ZIP must never end up on a market page
  // determined by their IP rather than their stated ZIP.
  //
  // Only when the API itself fails (null = timeout / network error) do we
  // fall through to geo, because a server failure is not a "not served"
  // signal — we genuinely don't know yet.
  const explicitZip = searchParams.zip ?? searchParams.code;
  if (explicitZip) {
    const cleanZip = explicitZip.replace(/\D/g, "").slice(0, 5);
    const lead = await getOperatorLead(cleanZip);
    if (lead !== null) {
      // Got a real API response — commit to it.
      if (!lead.isOutOfMarket) {
        const market = buildResolvedMarket(lead);
        if (market) return { market, source: "zip" };
      }
      // isOutOfMarket true, or the lead was in-market but missing required fields:
      // both mean we cannot serve this ZIP — return out-of-area, not a fallback.
      return { market: null, source: "out-of-area", outZip: cleanZip };
    }
    // lead is null → API timed out or threw — fall through to geo so a server
    // blip doesn't flash an out-of-area screen to a real customer.
  }

  // 3. Vercel IP geolocation (absent in local dev).
  try {
    const h = await headers();
    const postal = h.get("x-vercel-ip-postal-code");

    // 3a. Exact postal-code match — most precise when the geo ZIP is served.
    if (postal) {
      const market = buildResolvedMarket(await getOperatorLead(postal));
      if (market) return { market, source: "geo" };
    }

    // 3b. Nearest served market by coordinates. IP geo is approximate, so a
    // metro visitor's ZIP often isn't exactly served — match them to the
    // closest market within 75 mi instead of dropping to neutral.
    // IMPORTANT: if there is no match within 75 mi, return NEUTRAL, never
    // out-of-area — IP imprecision means we can't be confident.
    const lat = parseFloat(h.get("x-vercel-ip-latitude") ?? "");
    const lng = parseFloat(h.get("x-vercel-ip-longitude") ?? "");
    const region = h.get("x-vercel-ip-country-region");
    const nearSlug = nearestServedMarket(lat, lng, region);
    if (nearSlug) {
      const zip = canonicalZipForSlug(nearSlug);
      const market = zip ? buildResolvedMarket(await getOperatorLead(zip)) : null;
      if (market) return { market, source: "geo" };
    }
  } catch {
    // headers() unavailable (local dev) — treat as no geo.
  }

  // 4. Neutral — show the market chooser.
  return { market: null, source: "none" };
}
