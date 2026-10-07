import { after, NextResponse } from "next/server";
import { giveawayBySlug } from "@/config/giveaways";
import { enterGiveaway } from "@/lib/giveaway/service";
import { safeError } from "@/lib/giveaway/store";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/giveaway/enter — the giveaway form's submit.
//
// PUBLIC BY DESIGN, like /api/lead, and for the same reason: it serves an
// anonymous visitor on the marketing site. It reads no admin data.
//
// This is NOT /api/lead and does not call it. That route is left untouched —
// it is the path /exp and /lp/sell earn on. What a giveaway needs is different
// in kind: one entry per person, a routing decision, and most entries never
// going to the app at all. The rules are in lib/giveaway/service.ts.
//
// The same instinct applies here as there, though: do not get clever about
// who is "real". There is no honeypot, time trap, rate limit or origin check.
// Each of those ate real leads on /api/lead before being removed, and a
// conference hall is one shared Wi-Fi address. The protections that matter for
// a prize drawing are structural instead — one entry per email, test entries
// excluded by name, and a drawing that records the exact list it ran on.
//
// The email-list step runs in `after()`: the visitor has their "You're in!"
// before ActiveCampaign is ever called.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
// Room for a wait on the per-person lock, the app's intake (8s at most) and
// then the email-list sync after the response. The visitor is not waiting on
// most of it. 60 is what the Ask route already runs at on this plan.
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const giveaway = giveawayBySlug(body.giveaway);
  if (!giveaway) return NextResponse.json({ ok: false, error: "Unknown giveaway" }, { status: 404 });

  try {
    // Request IP + Referer for the email-consent record. Vercel puts the
    // client first in x-forwarded-for.
    const fwd = req.headers.get("x-forwarded-for");
    const ip = (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip"))?.trim() || null;
    const outcome = await enterGiveaway(giveaway, body, { ip, referer: req.headers.get("referer") });
    if (!outcome.ok) {
      return NextResponse.json(
        { ok: false, error: outcome.error, fields: outcome.fields ?? [] },
        { status: outcome.status }
      );
    }
    if (outcome.after) after(outcome.after);
    return NextResponse.json({
      ok: true,
      entryId: outcome.entryId,
      created: outcome.created,
      entries: outcome.entries,
      inEntryPeriod: outcome.inEntryPeriod,
      closed: outcome.closed,
      marketSlug: outcome.marketSlug,
    });
  } catch (err) {
    // No PII: the message of an unexpected error, never the body that caused
    // it — and not the part of a store error that quotes the failed command.
    console.error("[giveaway] enter FAILED", giveaway.slug, safeError(err));
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
