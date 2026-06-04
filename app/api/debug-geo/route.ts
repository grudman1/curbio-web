import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { geolocation } from "@vercel/functions";
import { getOperatorLead } from "@/lib/operator";
import { buildResolvedMarket, nearestServedMarket, canonicalZipForSlug } from "@/lib/markets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic — shows what geolocation data Vercel provides for the
// request, and what market it resolves to. Remove after we've confirmed geo.
export async function GET(req: Request) {
  const h = await headers();

  let geo: unknown;
  try {
    geo = geolocation(req);
  } catch (e) {
    geo = { error: String(e) };
  }

  const postal = h.get("x-vercel-ip-postal-code");
  let exact: unknown = null;
  if (postal) {
    const m = buildResolvedMarket(await getOperatorLead(postal));
    exact = m ? { name: m.name, hsm: m.hsm.name } : "out-of-market";
  }

  const lat = parseFloat(h.get("x-vercel-ip-latitude") ?? "");
  const lng = parseFloat(h.get("x-vercel-ip-longitude") ?? "");
  const region = h.get("x-vercel-ip-country-region");
  const nearSlug = nearestServedMarket(lat, lng, region);
  let nearest: unknown = null;
  if (nearSlug) {
    const zip = canonicalZipForSlug(nearSlug);
    const m = zip ? buildResolvedMarket(await getOperatorLead(zip)) : null;
    nearest = { slug: nearSlug, name: m?.name ?? null, hsm: m?.hsm.name ?? null };
  }

  return NextResponse.json(
    {
      vercelGeolocationHelper: geo,
      postalCodeHeader: postal ?? null,
      cityHeader: h.get("x-vercel-ip-city") ?? null,
      regionHeader: h.get("x-vercel-ip-country-region") ?? null,
      countryHeader: h.get("x-vercel-ip-country") ?? null,
      latLng: { lat: h.get("x-vercel-ip-latitude"), lng: h.get("x-vercel-ip-longitude") },
      resolvedExactZip: exact,
      resolvedNearestMarket: nearest,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
