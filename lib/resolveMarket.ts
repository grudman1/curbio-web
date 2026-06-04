import { headers } from "next/headers";
import { getOperatorLead } from "./operator";
import {
  buildResolvedMarket,
  canonicalZipForSlug,
  type ResolvedMarket,
} from "./markets";

export type MarketResolution = {
  market: ResolvedMarket | null;
  source: "param" | "zip" | "geo" | "none";
};

/**
 * Server-side market resolution. Priority:
 *   1. ?market= campaign slug → its canonical zip → live operator API
 *   2. explicit ?zip= / ?code= entered by the visitor → live operator API
 *   3. Vercel IP geolocation (x-vercel-ip-postal-code) → live operator API
 *   4. neutral "find your local team" state
 *
 * Explicit visitor zip beats passive geo on purpose: if someone types a zip
 * in the gate, that intent must win over where their IP happens to sit.
 * Every path fails closed to neutral — never a wrong HSM during detection.
 */
export async function resolveMarket(searchParams: {
  market?: string;
  zip?: string;
  code?: string;
}): Promise<MarketResolution> {
  // 1. ?market= campaign slug
  if (searchParams.market) {
    const zip = canonicalZipForSlug(searchParams.market);
    if (zip) {
      const market = buildResolvedMarket(await getOperatorLead(zip));
      if (market) return { market, source: "param" };
    }
  }

  // 2. explicit zip entry (?zip= or ?code=)
  const explicitZip = searchParams.zip ?? searchParams.code;
  if (explicitZip) {
    const market = buildResolvedMarket(await getOperatorLead(explicitZip));
    if (market) return { market, source: "zip" };
  }

  // 3. Vercel IP geolocation (absent in local dev)
  try {
    const h = await headers();
    const postal = h.get("x-vercel-ip-postal-code");
    if (postal) {
      const market = buildResolvedMarket(await getOperatorLead(postal));
      if (market) return { market, source: "geo" };
    }
  } catch {
    // headers() unavailable — treat as no geo
  }

  // 4. Neutral state
  return { market: null, source: "none" };
}
