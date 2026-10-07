import { type NextRequest } from "next/server";
import { giveawayBySlug } from "@/config/giveaways";
import { requireAdminApiSession, unauthorized } from "@/lib/adminApiAuth";
import { storeScope } from "@/lib/giveaway/mode";
import { readDrawSnapshot, readDraws } from "@/lib/giveaway/store";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/giveaway/draw?giveaway=<slug>&id=<draw id> — one drawing's
// full record as a JSON file: who ran it and when, the seed, the fingerprint,
// the winners and alternates, AND the frozen list it ran on.
//
// That last part is what makes the file self-sufficient. With the list and
// the seed, anyone can re-run lib/giveaway/draw.ts and check the result
// without access to this app — which is the whole point of keeping a record.
//
// OWNER-ONLY, gated here (middleware does not cover /api/*): the frozen list
// is every eligible entrant's email address.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireAdminApiSession();
  if (!session) return unauthorized();
  // Any signed-in admin (2026-10-07: no owner/staff distinction on the giveaway).

  const giveaway = giveawayBySlug(req.nextUrl.searchParams.get("giveaway"));
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!giveaway) return new Response("Unknown giveaway", { status: 404 });

  const scope = storeScope(giveaway);
  const record = (await readDraws(scope)).find((d) => d.id === id);
  if (!record) return new Response("Unknown drawing", { status: 404 });
  const list = await readDrawSnapshot(scope, id);

  const body = JSON.stringify(
    {
      record,
      // [email, entries] pairs, exactly as drawn from.
      list,
      howToVerify:
        "Sort the list by email (plain code-point order). SHA-256 of each `email<TAB>entries<NEWLINE>` line, " +
        "concatenated, must equal record.snapshotHash. Then run lib/giveaway/draw.ts runDraw(list, record.seed, n): " +
        "the order returned must match winners followed by alternates.",
    },
    null,
    2
  );
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${giveaway.slug}-drawing-${record.mode}-${record.ranAt.slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
