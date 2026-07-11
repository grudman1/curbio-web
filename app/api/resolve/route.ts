import { NextResponse, type NextRequest } from "next/server";
import { resolveMarket } from "@/lib/resolveMarket";

// Request-time market resolution for the prerendered `/` page — wraps the
// exact same lib/resolveMarket.ts logic the page used to run server-side
// (?zip=/?code= lookup, ?status=waitlist, Vercel IP geolocation), called
// client-side from components/HomeClient.tsx after the static shell paints.
//
// The response is intentionally slim: only what HomeClient renders. The full
// ResolvedMarket (HSM phone/Calendly etc.) isn't used by the landing page.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const r = await resolveMarket({
    market: sp.get("market") ?? undefined,
    zip: sp.get("zip") ?? undefined,
    code: sp.get("code") ?? undefined,
    status: sp.get("status") ?? undefined,
  });
  return NextResponse.json(
    {
      source: r.source,
      slug: r.market?.slug ?? null,
      crmMarketName: r.crmMarketName ?? null,
      outZip: r.outZip ?? null,
      geoCity: r.geoCity ?? null,
      geoRegion: r.geoRegion ?? null,
    },
    // Depends on ?zip= AND the caller's IP geo headers — never CDN-cacheable.
    // (The operator fetch inside still hits the 120s server data cache.)
    { headers: { "cache-control": "private, no-store" } }
  );
}
