import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { geolocation } from "@vercel/functions";
import { getOperatorLead } from "@/lib/operator";
import { buildResolvedMarket } from "@/lib/markets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic — shows what geolocation data Vercel provides for the
// request, and what market it resolves to. Remove after we've confirmed geo.
export async function GET(req: Request) {
  const h = await headers();
  const vercel: Record<string, string> = {};
  h.forEach((value, key) => {
    if (key.startsWith("x-vercel-")) vercel[key] = value;
  });

  let geo: unknown;
  try {
    geo = geolocation(req);
  } catch (e) {
    geo = { error: String(e) };
  }

  const postal = h.get("x-vercel-ip-postal-code");
  let resolved: unknown = null;
  if (postal) {
    const lead = await getOperatorLead(postal);
    const market = buildResolvedMarket(lead);
    resolved = { lead, market: market ? { name: market.name, hsm: market.hsm.name } : null };
  }

  return NextResponse.json(
    {
      vercelGeolocationHelper: geo,
      postalCodeHeader: postal ?? null,
      cityHeader: h.get("x-vercel-ip-city") ?? null,
      regionHeader: h.get("x-vercel-ip-country-region") ?? null,
      countryHeader: h.get("x-vercel-ip-country") ?? null,
      allXVercelHeaders: vercel,
      resolvedFromPostal: resolved,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
