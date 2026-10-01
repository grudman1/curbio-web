import { NextResponse } from "next/server";
import { GIVEAWAY_BY_SLUG } from "@/config/giveaways";
import { recordBooking } from "@/lib/giveaway/service";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/giveaway/booked — the giveaway page saw Calendly confirm a booking.
//
// PUBLIC BY DESIGN. The caller identifies an entry by the id it was handed
// when it entered — a random UUID, so it cannot be guessed, but it is the
// visitor's own browser making the claim. That is honoured straight away (the
// visitor sees their bonus) and checked against Calendly's list before the
// drawing; see reconcileBookings in lib/giveaway/service.ts.
//
// Until this existed, a completed booking fired an anonymous analytics event
// and nothing else: no lead record ever knew its owner had booked.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const giveaway = GIVEAWAY_BY_SLUG[String(body?.giveaway ?? "")];
  const entryId = typeof body?.entryId === "string" ? body.entryId : "";
  if (!giveaway || !/^[0-9a-f-]{36}$/i.test(entryId)) {
    return NextResponse.json({ ok: false, error: "Unknown entry" }, { status: 404 });
  }

  try {
    const eventUri = typeof body.eventUri === "string" ? body.eventUri : null;
    const outcome = await recordBooking(giveaway, entryId, eventUri);
    if (!outcome.ok) return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
    return NextResponse.json({ ok: true, entries: outcome.entries });
  } catch (err) {
    console.error("[giveaway] booked FAILED", giveaway.slug, err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
