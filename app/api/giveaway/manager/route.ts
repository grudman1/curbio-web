import { NextResponse, type NextRequest } from "next/server";
import { buildResolvedMarket, buildResolvedMarketFromSlug, canonicalZipForSlug } from "@/lib/markets";
import { getOperatorLead } from "@/lib/operator";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/giveaway/manager?market=<slug> — who the local manager is, and where
// to book them.
//
// PUBLIC BY DESIGN: a name, a headshot path and a Calendly link — everything
// the /confirm page already shows to anyone who submits a form.
//
// The same lookup /confirm does, exposed as an endpoint because the giveaway
// page is prerendered and never asks the operator API at build time (a hung
// operator fetch failed every deploy on 2026-07-23). The page calls this only
// AFTER an entry is confirmed, so a slow operator API can delay the booking
// card and nothing else.
//
// `calendlyUrl` is null when the operator API did not answer. The static
// fallback still names the manager, so the card can say who will call — it
// just cannot offer a calendar.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("market");
  const zip = canonicalZipForSlug(slug);
  if (!zip) return NextResponse.json({ ok: false, manager: null }, { status: 404 });

  const resolved = buildResolvedMarket(await getOperatorLead(zip)) ?? buildResolvedMarketFromSlug(slug);
  if (!resolved) return NextResponse.json({ ok: false, manager: null }, { status: 404 });

  const { hsm } = resolved;
  const calendlyUrl = hsm.calendlyUrl && hsm.calendlyUrl !== "#" ? hsm.calendlyUrl : null;
  return NextResponse.json(
    {
      ok: true,
      manager: {
        name: hsm.name,
        firstName: hsm.firstName,
        title: hsm.title,
        photo: hsm.photo,
        market: resolved.name,
        calendlyUrl,
      },
    },
    {
      headers: {
        // A full answer is cached for the same two minutes the operator lookup
        // is. The calendar-less fallback is NOT: caching it would hand every
        // visitor in that market "no calendar" for two minutes because of one
        // slow response.
        "cache-control": calendlyUrl ? "public, s-maxage=120, stale-while-revalidate=600" : "no-store",
      },
    }
  );
}
